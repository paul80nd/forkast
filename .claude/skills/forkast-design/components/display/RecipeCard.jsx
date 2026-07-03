import React, { useState } from 'react'
import { Tag } from './Tag'

/**
 * Forkast's signature card. Image with optional ★ and ⇄-versions overlays, cuisine
 * chip, display-font title, 2-line description and a time · protein meta row. Lifts
 * on hover. Pass `onToggleSelect` to show the bulk-select tickbox.
 */
export function RecipeCard({ recipe, stars, variantCount, selected = false, onToggleSelect, onOpen }) {
  const [hover, setHover] = useState(false)
  const showVersions = variantCount != null && variantCount > 1
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden', background: 'var(--fk-surface-card)',
        border: '1px solid ' + (selected ? 'var(--fk-brand)' : 'var(--fk-border)'),
        borderRadius: 'var(--fk-radius-lg)',
        boxShadow: selected ? 'var(--fk-shadow-focus)' : hover ? 'var(--fk-shadow-md)' : 'var(--fk-shadow-sm)',
        transform: hover ? 'translateY(var(--fk-lift))' : 'none',
        transition: 'transform var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)',
      }}
    >
      <button type="button" onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
        <div style={{ position: 'relative' }}>
          <img src={recipe.image} alt="" loading="lazy" style={{ aspectRatio: '4 / 3', width: '100%', objectFit: 'cover', display: 'block' }} />
          {stars != null && (
            <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(255,255,255,.92)', color: 'var(--fk-star-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 'var(--fk-weight-semibold)', padding: '2px 8px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-xs)' }}>{'★'.repeat(stars)}</span>
          )}
          {showVersions && (
            <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(255,255,255,.92)', color: 'var(--fk-brand-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 'var(--fk-weight-semibold)', padding: '2px 8px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-xs)' }}>⇄ {variantCount} versions</span>
          )}
        </div>
        <div style={{ padding: '12px' }}>
          <Tag tone="neutral">{recipe.cuisine}</Tag>
          <h3 style={{ margin: '8px 0 0', fontFamily: 'var(--fk-font-display)', fontWeight: 'var(--fk-weight-semibold)', fontSize: 'var(--fk-text-h3)', lineHeight: 'var(--fk-leading-snug)', color: 'var(--fk-text)' }}>{recipe.title}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-snug)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{recipe.description}</p>
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>
            <span>⏱ {recipe.prepTime} min</span>
            {recipe.mainProtein && <span style={{ textTransform: 'capitalize' }}>· {recipe.mainProtein}</span>}
          </div>
        </div>
      </button>
      {onToggleSelect && (
        <label style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', background: 'rgba(255,255,255,.92)', padding: '4px', borderRadius: 'var(--fk-radius-sm)', boxShadow: 'var(--fk-shadow-xs)', cursor: 'pointer' }}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={'Select ' + recipe.title} style={{ width: '16px', height: '16px', accentColor: 'var(--fk-brand)' }} />
        </label>
      )}
    </div>
  )
}
