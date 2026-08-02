import type { ReactNode } from 'react'

export const adminField =
  'w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 outline-none focus:border-brand'

export function FormField({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      {hint ? <span className="-mt-1 text-[11px] leading-snug text-neutral-500">{hint}</span> : null}
      {children}
    </label>
  )
}
