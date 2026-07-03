import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { RecipeDetail } from './RecipeDetail'
import type { Recipe } from '../schema/recipe'

// A pop-up showing a recipe in the full detail-page layout (via RecipeDetail — image, facts,
// editable rating, nutrition, ingredients, method). Opened from the Plan page so reviewing a
// suggested or planned meal never navigates away. Closes on Escape, backdrop click, or ✕; locks
// body scroll while open. "Open full page →" jumps to the real detail route when wanted.
export function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={recipe.title}
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-4xl rounded-2xl bg-card p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to={`/recipe/${recipe.id}`}
            className="text-sm text-brand-ink hover:underline"
          >
            Open full page →
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-muted"
          >
            ✕
          </button>
        </div>
        <RecipeDetail recipe={recipe} />
      </div>
    </div>,
    document.body,
  )
}
