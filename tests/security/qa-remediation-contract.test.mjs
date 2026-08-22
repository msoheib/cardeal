import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('dealer form accepts multiple color rows and uses unambiguous Arabic labels', async () => {
  const [component, schema] = await Promise.all([
    read('../../components/dealer-vehicle-form.tsx'),
    read('../../lib/dealer-vehicle-form.ts'),
  ])

  assert.match(component, /الألوان والكميات/)
  assert.match(component, /إضافة لون آخر/)
  assert.match(component, /الطراز \/ اسم الموديل/)
  assert.match(component, /سنة الصنع/)
  assert.doesNotMatch(component, /كل إعلان يمثل لوناً واحداً/)
  assert.match(schema, /duplicate_color_row|لا يمكن تكرار اللون نفسه/)
})

test('buyer offer flow requires a selected available color', async () => {
  const [bidInput, details] = await Promise.all([
    read('../../components/bid-input.tsx'),
    read('../../app/cars/[id]/page.tsx'),
  ])

  assert.match(bidInput, /اختر اللون المطلوب قبل تقديم العرض/)
  assert.match(bidInput, /car_configuration_id: selectedConfigId/)
  assert.match(details, /colors=\{listing\.colors\}/)
  assert.match(details, /الألوان المتاحة/)
})

test('mobile navigation uses a sheet rather than horizontal overflow', async () => {
  const navbar = await read('../../components/app-navbar.tsx')
  assert.match(navbar, /SheetContent/)
  assert.match(navbar, /فتح قائمة التنقل/)
  assert.doesNotMatch(navbar, /overflow-x-auto/)
})

test('user-facing error mapping hides schema and RPC implementation details', async () => {
  const errors = await read('../../lib/arabic-errors.ts')
  assert.match(errors, /PGRST202\|schema cache\|could not find the function/)
  assert.match(errors, /الخدمة غير متاحة مؤقتاً بسبب تحديث النظام/)
})
