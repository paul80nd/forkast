import type { ReactNode } from 'react'

/**
 * A bordered single-select toggle — the "Cooking for 2 / 4 / 6" portions control and the
 * recipe serving-scaler (forkast-design). Active segment is the stable brand-700 fill (white
 * text, legible in both themes); `format` customises the label without changing the value.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  format,
  className = '',
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  size?: 'sm' | 'md'
  format?: (value: T) => ReactNode
  className?: string
}) {
  const pad = size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex overflow-hidden rounded-md border border-line-strong text-sm ${className}`}
    >
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`${pad} font-medium transition ${
              active ? 'bg-brand-700 text-white' : 'bg-card text-muted hover:bg-sunken'
            }`}
          >
            {format ? format(opt) : opt}
          </button>
        )
      })}
    </div>
  )
}
