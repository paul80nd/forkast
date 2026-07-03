import type { SelectHTMLAttributes } from 'react'

// Shared box styling for text inputs and selects — border, background, colour,
// radius, focus ring. Padding and text-size are added by the caller (so the sm
// select and the md input don't collide on the same padding utility). Sharing
// this means an input and a select render as the same box and line up in a row
// (matches the forkast-design field primitive).
export const fieldBoxClass =
  'appearance-none rounded-md border border-line-strong bg-card text-ink ' +
  'transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ' +
  'focus:outline-none'

const SIZES = {
  md: { box: 'py-1.5 pr-8 pl-2.5 text-sm', chevron: 'right-2.5 text-[11px]' },
  sm: { box: 'py-1 pr-6 pl-2 text-xs', chevron: 'right-1.5 text-[10px]' },
} as const

// Omit the native numeric `size` attribute so we can repurpose it for sm/md.
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: keyof typeof SIZES
}

// A select styled to match a text input, with a custom ▾ chevron. Native selects
// render at their own (taller) height and draw a platform chevron, which breaks
// row alignment — appearance-none + our own chevron keeps them a matching box.
export function Select({ className = '', size = 'md', children, ...props }: Props) {
  const s = SIZES[size]
  return (
    <span className="relative inline-block">
      <select {...props} className={`${fieldBoxClass} ${s.box} cursor-pointer ${className}`}>
        {children}
      </select>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${s.chevron}`}
      >
        ▾
      </span>
    </span>
  )
}
