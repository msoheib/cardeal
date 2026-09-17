import * as React from 'react'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Narrow, centered frame shared by sign-in and sign-up. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center bg-background px-4 py-10 sm:items-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="page-title">{title}</h1>
          <p className="text-sm">{description}</p>
        </div>
        <div className="surface p-5 sm:p-6">{children}</div>
        {footer && <div className="text-center text-sm">{footer}</div>}
      </div>
    </div>
  )
}
