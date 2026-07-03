import type { ReactNode } from 'react'

const TONE_FILL: Record<'brand' | 'info' | 'star', string> = {
  brand: 'bg-brand',
  info: 'bg-info',
  star: 'bg-star',
}

/**
 * A slim determinate progress bar — e.g. Curate's triage progress ("12 of 40"), so the
 * pile feels finite. `label`/`showValue` render a caption row above the track; `tone` picks
 * the fill colour. A string `label` doubles as the bar's accessible name.
 */
export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  label,
  showValue = false,
  className = '',
}: {
  value: number
  max?: number
  tone?: 'brand' | 'info' | 'star'
  label?: ReactNode
  showValue?: boolean
  className?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex justify-between gap-2 text-xs text-muted">
          {label && <span className="whitespace-nowrap">{label}</span>}
          {showValue && (
            <span className="whitespace-nowrap">
              {value} of {max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === 'string' ? label : undefined}
        className="h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={`h-full rounded-full ${TONE_FILL[tone]} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
