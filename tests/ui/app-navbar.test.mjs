import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import React from 'react'
import { act, create } from 'react-test-renderer'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../../components/app-navbar.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
}).outputText

// Exercise the real component and React hooks; replace only external services,
// Next routing, and DOM-dependent UI primitives. No production credentials.
function mountNavbar(t, { pathname = '/dealer/cars/new', signOutResult, signOutThrows = false } = {}) {
  let authCallback
  let subscriptions = 0
  let unsubscriptions = 0
  let signOutCalls = 0
  const redirects = []
  const toasts = []
  const router = { replace: (url) => redirects.push(url), refresh: () => {} }
  const auth = {
    onAuthStateChange(callback) {
      authCallback = callback
      subscriptions++
      return { data: { subscription: { unsubscribe: () => { unsubscriptions++ } } } }
    }
  }
  const Link = ({ children, ...props }) => React.createElement('a', props, children)
  const Button = ({ asChild, children, ...props }) => asChild
    ? React.cloneElement(children, props)
    : React.createElement('button', props, children)
  const Container = ({ children, ...props }) => React.createElement('div', props, children)
  const Sheet = ({ children, ...props }) => React.createElement('section', props, children)
  const stubs = {
    'next/link': Link,
    'next/navigation': { usePathname: () => pathname, useRouter: () => router },
    '@/lib/supabase': { supabase: { auth } },
    '@/lib/auth': {
      async signOut() {
        signOutCalls++
        if (signOutThrows) throw new Error('Network unavailable')
        const result = await (signOutResult ?? { error: null })
        if (!result.error) authCallback('SIGNED_OUT', null)
        return result
      }
    },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/hooks/use-toast': { toast: (value) => toasts.push(value) },
    '@/components/ui/button': { Button },
    '@/components/ui/sheet': {
      Sheet, SheetContent: Container, SheetHeader: Container,
      SheetTitle: Container, SheetDescription: Container, SheetTrigger: Container
    }
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => Object.hasOwn(stubs, name) ? stubs[name] : require(name)
  }, { filename: 'app-navbar.cjs' })
  let renderer
  act(() => { renderer = create(React.createElement(exports.AppNavbar)) })
  t.after(() => act(() => renderer.unmount()))

  return {
    renderer, redirects, toasts,
    emit: (event, session) => act(() => { authCallback(event, session) }),
    links: (href) => renderer.root.findAllByType('a').filter((node) => node.props.href === href),
    signOutButtons: () => renderer.root.findAllByType('button').filter((node) =>
      node.children.some((child) => typeof child === 'string' && child.includes('الخروج'))),
    sheet: () => renderer.root.findByType(Sheet),
    counts: () => ({ subscriptions, unsubscriptions, signOutCalls })
  }
}

const session = { user: { id: 'navbar-test-user' } }

function assertGuest(nav) {
  // The test renderer includes both desktop and mobile branches.
  assert.equal(nav.links('/auth/login').length, 2)
  assert.equal(nav.links('/auth/register').length, 2)
  assert.equal(nav.signOutButtons().length, 0)
}

function assertSignedIn(nav) {
  assert.equal(nav.links('/auth/login').length, 0)
  assert.equal(nav.links('/auth/register').length, 0)
  assert.equal(nav.signOutButtons().length, 2)
  assert.equal(nav.links('/dashboard').filter((node) => node.children.includes('حسابي')).length, 2)
}

test('does not flash guest or account actions before the initial session resolves', (t) => {
  const nav = mountNavbar(t)
  assert.equal(nav.links('/auth/login').length, 0)
  assert.equal(nav.links('/auth/register').length, 0)
  assert.equal(nav.signOutButtons().length, 0)
  assert.equal(nav.renderer.root.findAllByProps({ role: 'status' }).length, 2)
})

test('shows guest actions after an empty initial session', (t) => {
  const nav = mountNavbar(t)
  nav.emit('INITIAL_SESSION', null)
  assertGuest(nav)
})

for (const role of ['buyer', 'dealer', 'admin']) {
  test(`restores account actions for a signed-in ${role} after reload`, (t) => {
    const nav = mountNavbar(t)
    nav.emit('INITIAL_SESSION', { user: { ...session.user, user_metadata: { user_type: role } } })
    assertSignedIn(nav)
  })
}

test('tracks login, token refresh, and logout events without remounting', (t) => {
  const nav = mountNavbar(t)
  nav.emit('INITIAL_SESSION', null)
  assertGuest(nav)
  nav.emit('SIGNED_IN', session)
  assertSignedIn(nav)
  nav.emit('TOKEN_REFRESHED', session)
  assertSignedIn(nav)
  // Also covers logout triggered elsewhere, such as a dashboard or another tab.
  nav.emit('SIGNED_OUT', null)
  assertGuest(nav)
  assert.equal(nav.counts().subscriptions, 1)
})

test('unsubscribes from auth updates on unmount', (t) => {
  const nav = mountNavbar(t)
  act(() => nav.renderer.unmount())
  assert.equal(nav.counts().unsubscriptions, 1)
})

test('sign-out disables both buttons, closes the mobile menu and returns home', async (t) => {
  let finishSignOut
  const pending = new Promise((resolve) => { finishSignOut = resolve })
  const nav = mountNavbar(t, { signOutResult: pending })
  nav.emit('INITIAL_SESSION', session)
  act(() => nav.sheet().props.onOpenChange(true))
  let signingOut
  act(() => { signingOut = nav.signOutButtons()[1].props.onClick() })
  assert.ok(nav.signOutButtons().every((node) => node.props.disabled))
  await act(async () => { await nav.signOutButtons()[0].props.onClick() })
  assert.equal(nav.counts().signOutCalls, 1)
  await act(async () => {
    finishSignOut({ error: null })
    await signingOut
  })
  assertGuest(nav)
  assert.equal(nav.sheet().props.open, false)
  assert.deepEqual(nav.redirects, ['/'])
})

for (const mode of ['returned', 'thrown']) {
  test(`keeps account actions and offers retry after a ${mode} sign-out error`, async (t) => {
    const nav = mountNavbar(t, {
      signOutResult: { error: new Error('Sign-out failed') },
      signOutThrows: mode === 'thrown'
    })
    nav.emit('INITIAL_SESSION', session)
    await act(async () => { await nav.signOutButtons()[0].props.onClick() })
    assertSignedIn(nav)
    assert.ok(nav.signOutButtons().every((node) => node.props.disabled === false))
    assert.equal(nav.redirects.length, 0)
    assert.equal(nav.toasts[0].title, 'تعذر تسجيل الخروج')
  })
}

test('mobile account navigation closes the menu', (t) => {
  const nav = mountNavbar(t)
  nav.emit('INITIAL_SESSION', session)
  act(() => nav.sheet().props.onOpenChange(true))
  const accountLink = nav.links('/dashboard').find((node) => node.props.onClick)
  act(() => accountLink.props.onClick())
  assert.equal(nav.sheet().props.open, false)
})

test('mobile primary navigation closes the menu', (t) => {
  const nav = mountNavbar(t)
  nav.emit('INITIAL_SESSION', session)
  const primary = [['/', 'الرئيسية'], ['/cars', 'السوق'], ['/dashboard', 'لوحة التحكم'], ['/dealer/apply', 'الموردون']]
  for (const [href, label] of primary) {
    act(() => nav.sheet().props.onOpenChange(true))
    const link = nav.links(href).find((node) => node.children.includes(label) && node.props.onClick)
    assert.ok(link, `mobile link to ${href} must close the menu`)
    act(() => link.props.onClick())
    assert.equal(nav.sheet().props.open, false)
  }
})

test('mobile guest navigation closes the menu', (t) => {
  const nav = mountNavbar(t, { pathname: '/auth/login' })
  nav.emit('INITIAL_SESSION', null)
  for (const href of ['/auth/login', '/auth/register']) {
    act(() => nav.sheet().props.onOpenChange(true))
    act(() => nav.links(href).find((node) => node.props.onClick).props.onClick())
    assert.equal(nav.sheet().props.open, false)
  }
})
