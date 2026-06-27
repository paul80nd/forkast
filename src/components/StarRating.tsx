import { useState } from 'react'
import type { Stars } from '../schema/userData'
import { STAR_LABELS } from '../lib/curation'

const SIZES = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' } as const

/**
 * Star rating. Interactive when `onChange` is given (click a star to set it,
 * click the current value to clear); otherwise read-only display.
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value?: Stars
  onChange?: (v: Stars | undefined) => void
  size?: keyof typeof SIZES
}) {
  const [hover, setHover] = useState<Stars | null>(null)
  const readOnly = !onChange
  const shown = hover ?? value ?? 0

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {([1, 2, 3, 4, 5] as Stars[]).map((n) => {
        const cls = `${SIZES[size]} leading-none transition ${
          n <= shown ? 'text-amber-500' : 'text-stone-300'
        } ${readOnly ? '' : 'cursor-pointer hover:scale-110'}`

        if (readOnly) {
          return (
            <span key={n} className={cls} aria-hidden>
              ★
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            title={`${n} — ${STAR_LABELS[n]}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}: ${STAR_LABELS[n]}`}
            className={cls}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange?.(value === n ? undefined : n)}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
