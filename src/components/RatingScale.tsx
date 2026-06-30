import { useState } from 'react'
import type { Rotation, Stars } from '../schema/userData'
import { ROTATION_LABELS, STAR_LABELS } from '../lib/curation'

type Level = 1 | 2 | 3 | 4 | 5

const SIZES = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' } as const
const LABEL_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const

/**
 * A 1–5 fillable rating control. Interactive when `onChange` is given (click an icon to set,
 * click the current value to clear); otherwise read-only display. Optionally shows the label
 * for the hovered/current value to the right. Used for both quality (★) and rotation (◆).
 */
export function RatingScale({
  value,
  onChange,
  labels,
  glyph = '★',
  filledClass = 'text-amber-500',
  size = 'md',
  showLabel = false,
  name = 'rating',
}: {
  value?: Level
  onChange?: (v: Level | undefined) => void
  labels: Record<Level, string>
  glyph?: string
  /** Tailwind text-colour class for filled icons (empty icons are always muted). */
  filledClass?: string
  size?: keyof typeof SIZES
  showLabel?: boolean
  /** For the icon aria-labels, e.g. "rating" → "3 rating: I'd eat it". */
  name?: string
}) {
  const [hover, setHover] = useState<Level | null>(null)
  const readOnly = !onChange
  const shown = hover ?? value ?? 0
  const labelFor = hover ?? value

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
        {([1, 2, 3, 4, 5] as Level[]).map((n) => {
          const cls = `${SIZES[size]} leading-none transition ${
            n <= shown ? filledClass : 'text-stone-300'
          } ${readOnly ? '' : 'cursor-pointer hover:scale-110'}`

          if (readOnly) {
            return (
              <span key={n} className={cls} aria-hidden>
                {glyph}
              </span>
            )
          }
          return (
            <button
              key={n}
              type="button"
              title={`${n} — ${labels[n]}`}
              aria-label={`${n} ${name}: ${labels[n]}`}
              className={cls}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange?.(value === n ? undefined : n)}
            >
              {glyph}
            </button>
          )
        })}
      </div>
      {showLabel && (
        <span className={`${LABEL_SIZES[size]} text-stone-500`}>
          {labelFor ? labels[labelFor] : ''}
        </span>
      )}
    </div>
  )
}

/** Quality rating — amber stars with the household verdicts. */
export function StarRating(props: {
  value?: Stars
  onChange?: (v: Stars | undefined) => void
  size?: keyof typeof SIZES
  showLabel?: boolean
}) {
  return <RatingScale glyph="★" filledClass="text-amber-500" labels={STAR_LABELS} name="rating" {...props} />
}

/** Frequency rating — sky diamonds, "how often you'd want it" (3 = neutral). */
export function RotationRating(props: {
  value?: Rotation
  onChange?: (v: Rotation | undefined) => void
  size?: keyof typeof SIZES
  showLabel?: boolean
}) {
  return (
    <RatingScale glyph="◆" filledClass="text-sky-500" labels={ROTATION_LABELS} name="rotation" {...props} />
  )
}
