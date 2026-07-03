import type { SelectHTMLAttributes } from 'react'

// Shared box styling for text inputs and selects — everything bar horizontal
// padding, which callers add (px-2.5 for an input; pl-2.5 pr-8 for a select, to
// leave room for the chevron). Sharing border, font, vertical padding and radius
// means both render at an identical height and line up in a filter row (matches
// the forkast-design field primitive). Callers own horizontal padding so the
// select's asymmetric pr never collides with a shared px.
export const fieldBoxClass =
  'appearance-none rounded-md border border-stone-300 bg-white py-1.5 text-sm ' +
  'text-stone-900 transition-colors focus:border-orange-500 focus:ring-2 ' +
  'focus:ring-orange-200 focus:outline-none dark:bg-stone-100'

// A select styled to match a text input, with a custom ▾ chevron. Native selects
// render at their own (taller) height and draw a platform chevron, which breaks
// row alignment — appearance-none + our own chevron keeps them a matching box.
export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-block">
      <select {...props} className={`${fieldBoxClass} cursor-pointer pr-8 pl-2.5 ${className}`}>
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-stone-500"
      >
        ▾
      </span>
    </span>
  )
}
