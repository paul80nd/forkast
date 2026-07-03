import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeDetail } from '../components/RecipeDetail'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { addToPlan, removeFromPlan } from '../app/plan'
import { deleteRecipe } from '../app/cleanup'

export function RecipePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  // undefined = loading, null = not found
  const recipe = useLiveQuery(async () => (await db.recipes.get(id)) ?? null, [id])
  // The plan's recipe ids — membership is checked per shown variant (a swap may differ).
  const planIds = useLiveQuery(
    async () => (await db.plans.get(CURRENT_PLAN_ID))?.recipeIds ?? [],
    [],
  )

  if (recipe === undefined) {
    return <p className="text-stone-600">Loading…</p>
  }

  if (recipe === null) {
    return (
      <section>
        <p className="text-stone-600">Recipe not found.</p>
        <Link to="/browse" className="mt-2 inline-block text-orange-700 hover:underline">
          ← Back to Browse
        </Link>
      </section>
    )
  }

  return (
    <section>
      <Link to="/browse" className="text-sm text-orange-700 hover:underline">
        ← Back to Browse
      </Link>

      <div className="mt-3">
        <RecipeDetail
          recipe={recipe}
          headerActions={(shown) => {
            /* Split button: primary add/remove from week, with secondary actions in a menu.
               Acts on the shown variant, so adding the chosen swap plans that recipe. */
            const inPlan = (planIds ?? []).includes(shown.id)
            return (
            <div className="relative flex shrink-0 items-stretch">
              {inPlan ? (
                <button
                  type="button"
                  onClick={() => removeFromPlan(shown.id)}
                  className="rounded-l-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  ✓ In week
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addToPlan(shown.id)}
                  className="rounded-l-md bg-[#2a673a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#245330]"
                >
                  + Add to week
                </button>
              )}
              <button
                type="button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={`rounded-r-md border-l px-2 py-1.5 text-sm font-medium ${
                  inPlan
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-orange-400 bg-[#2a673a] text-white hover:bg-[#245330]'
                }`}
              >
                ▾
              </button>
              {menuOpen && (
                <>
                  {/* Backdrop to close on outside click. */}
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-stone-200 bg-white dark:bg-stone-100 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setMenuOpen(false)
                        if (
                          window.confirm(
                            `Delete “${shown.title}”?\n\nThis removes it and its ratings for good (re-import to restore).`,
                          )
                        ) {
                          await deleteRecipe(shown.id)
                          navigate('/browse')
                        }
                      }}
                      className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Delete recipe
                    </button>
                  </div>
                </>
              )}
            </div>
            )
          }}
        />
      </div>
    </section>
  )
}
