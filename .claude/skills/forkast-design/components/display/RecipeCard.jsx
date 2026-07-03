import React, { useState } from 'react'

/**
 * Forkast's signature card. Image with optional ★ and ⇄-versions overlays, then a
 * flexible body: display-font title, 2-line description, and a footer pinned to the
 * bottom (so meta lines up across a masonry grid of unequal-height cards). The
 * footer carries time · protein on the left and the cuisine — plain text, ranked
 * above the meta but below the title — on the right.
 *
 * Multi-select: pass `onToggleSelect` to enable the tickbox. It reveals on
 * hover/focus and becomes persistent once the card is `selected` (select mode).
 */
export function RecipeCard({ recipe, stars, variantCount, selected = false, onToggleSelect, onOpen }) {
  const [hover, setHover] = useState(false)
  const showVersions = variantCount != null && variantCount > 1
  const showTick = onToggleSelect && (hover || selected)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--fk-surface-card)',
        border: '1px solid ' + (selected ? 'var(--fk-brand)' : 'var(--fk-border)'),
        borderRadius: 'var(--fk-radius-lg)',
        boxShadow: selected ? 'var(--fk-shadow-focus)' : hover ? 'var(--fk-shadow-md)' : 'var(--fk-shadow-sm)',
        transform: hover ? 'translateY(var(--fk-lift))' : 'none',
        transition: 'transform var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)',
      }}
    >
      <button type="button" onClick={onOpen} style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', textAlign: 'left', padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
        <div style={{ position: 'relative' }}>
          <img src={recipe.image} alt="" loading="lazy" style={{ aspectRatio: '4 / 3', width: '100%', objectFit: 'cover', display: 'block' }} />
          {stars != null && (
            <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(255,255,255,.92)', color: 'var(--fk-star-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 'var(--fk-weight-semibold)', padding: '2px 8px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-xs)' }}>{'★'.repeat(stars)}</span>
          )}
          {showVersions && (
            <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(255,255,255,.92)', color: 'var(--fk-brand-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 'var(--fk-weight-semibold)', padding: '2px 8px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-xs)' }}>⇄ {variantCount} versions</span>
          )}
        </div>
        {/* Body grows; footer is pinned to the bottom via margin-top:auto. */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 'var(--fk-weight-semibold)', fontSize: 'var(--fk-text-h3)', lineHeight: 'var(--fk-leading-snug)', color: 'var(--fk-text)' }}>{recipe.title}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-snug)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{recipe.description}</p>
          <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', whiteSpace: 'nowrap' }}>
              ⏱ {recipe.prepTime} min{recipe.mainProtein && <span style={{ textTransform: 'capitalize' }}> · {recipe.mainProtein}</span>}
            </span>
            <span style={{ fontSize: 'var(--fk-text-sm)', fontWeight: 'var(--fk-weight-medium)', color: 'var(--fk-text)', whiteSpace: 'nowrap' }}>{recipe.cuisine}</span>
          </div>
        </div>
      </button>
      {showTick && (
        <label style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', background: 'rgba(255,255,255,.92)', padding: '4px', borderRadius: 'var(--fk-radius-sm)', boxShadow: 'var(--fk-shadow-xs)', cursor: 'pointer' }}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={'Select ' + recipe.title} style={{ width: '16px', height: '16px', accentColor: 'var(--fk-brand)' }} />
        </label>
      )}
    </div>
  )
}
