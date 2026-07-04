import { useEffect, useState } from 'react'
import { useRecipeImage } from '../hooks/useRecipeImage'

// A recipe photo that resolves via the image pack (falling back to the dev/base route) and
// degrades to a neutral brand-tint tile if the image is missing — so the hosted build shows
// a calm placeholder rather than a broken-image glyph when the pack isn't loaded. Drop-in
// for the former `<img src={resolveAsset(recipe.image)} …>` — same className/alt/loading.
export function RecipeImage({
  image,
  alt = '',
  className = '',
  loading,
}: {
  image: string
  alt?: string
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  const src = useRecipeImage(image)
  const [failed, setFailed] = useState(false)

  // A new src (e.g. the stored blob swapping in) gets a fresh chance to load.
  useEffect(() => setFailed(false), [src])

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-wash text-brand-ink/40 ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <span aria-hidden="true" className="text-2xl">
          🍽
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  )
}
