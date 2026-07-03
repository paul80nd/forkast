import React, { useState } from 'react'

/**
 * A 1–5 fillable rating control — Forkast's core curation input. Interactive when
 * `onChange` is given (click a glyph to set, click the current value to clear);
 * read-only otherwise. Used for both quality (★, honey) and rotation (◆, harbour).
 */
const SIZES = { sm: '16px', md: '20px', lg: '30px' }
const LABEL_SIZES = { sm: 'var(--fk-text-xs)', md: 'var(--fk-text-sm)', lg: 'var(--fk-text-body)' }

export function RatingScale({
  value,
  onChange,
  labels,
  glyph = '★',
  filledColor = 'var(--fk-star)',
  size = 'md',
  showLabel = false,
  name = 'rating',
}) {
  const [hover, setHover] = useState(null)
  const readOnly = !onChange
  const shown = hover ?? value ?? 0
  const labelFor = hover ?? value
  const px = SIZES[size] ?? SIZES.md

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-flex', gap: '2px' }} onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= shown
          const common = {
            fontSize: px, lineHeight: 1,
            color: filled ? filledColor : 'var(--fk-neutral-300)',
            transition: 'color var(--fk-duration) var(--fk-ease), transform var(--fk-duration) var(--fk-ease)',
          }
          if (readOnly) return <span key={n} aria-hidden style={common}>{glyph}</span>
          return (
            <button
              key={n}
              type="button"
              title={labels ? n + ' — ' + labels[n] : String(n)}
              aria-label={labels ? n + ' ' + name + ': ' + labels[n] : n + ' ' + name}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? undefined : n)}
              style={{
                ...common, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                transform: hover === n ? 'scale(1.12)' : 'none',
              }}
            >{glyph}</button>
          )
        })}
      </span>
      {showLabel && (
        <span style={{ fontSize: LABEL_SIZES[size], color: 'var(--fk-text-muted)' }}>
          {labelFor && labels ? labels[labelFor] : ''}
        </span>
      )}
    </span>
  )
}

const STAR_LABELS = { 1: 'Yuk', 2: 'Rather not', 3: "I'd eat it", 4: 'Like it', 5: 'Yum Yum' }
const ROTATION_LABELS = { 1: 'Rarely', 2: 'Occasionally', 3: 'Now & then', 4: 'Often', 5: 'On repeat' }

/** Quality — honey ★ with the household verdicts. */
export function StarRating(props) {
  return <RatingScale glyph="★" filledColor="var(--fk-star)" labels={STAR_LABELS} name="rating" {...props} />
}
/** Frequency — harbour ◆, "how often you'd want it" (3 = neutral). */
export function RotationRating(props) {
  return <RatingScale glyph="◆" filledColor="var(--fk-info)" labels={ROTATION_LABELS} name="rotation" {...props} />
}
