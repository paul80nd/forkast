import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { CURRENT_PLAN_ID } from '../lib/plan'
import {
  getPlanShoppingList,
  toggleChecked,
  clearChecked,
  addExtra,
  toggleExtra,
  removeExtra,
} from '../app/shopping'

export function ShopPage() {
  const plan = useLiveQuery(() => db.plans.get(CURRENT_PLAN_ID), [])
  const shopping = useLiveQuery(() => db.shopping.get(CURRENT_PLAN_ID), [])
  const list = useLiveQuery(() => getPlanShoppingList(), [])
  const [extraText, setExtraText] = useState('')

  const portions = plan?.portions ?? 2
  const plannedCount = plan?.recipeIds?.length ?? 0

  if (plan === undefined || list === undefined) return <p className="text-stone-500">Loading…</p>

  if (plannedCount === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white dark:bg-stone-100 p-8 text-center text-stone-500">
          No meals planned, so nothing to buy.{' '}
          <Link to="/plan" className="text-orange-600 hover:underline">
            Plan a week →
          </Link>
        </div>
      </section>
    )
  }

  const checked = new Set(shopping?.checked ?? [])
  const extras = shopping?.extras ?? []
  const itemCount =
    list.aisles.reduce((n, a) => n + a.lines.length, 0) + list.unmatched.length

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span>
            {itemCount} items · {plannedCount} meals · for {portions}
          </span>
          {checked.size > 0 && (
            <button
              type="button"
              onClick={() => clearChecked()}
              className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            >
              Clear ticks
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {list.aisles.map((group) => (
          <div key={group.aisle}>
            <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {group.aisle}
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
              {group.lines.map((line) => (
                <CheckRow
                  key={line.key}
                  label={line.label}
                  detail={line.detail}
                  checked={checked.has(line.key)}
                  onToggle={() => toggleChecked(line.key)}
                />
              ))}
            </ul>
          </div>
        ))}

        {list.unmatched.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
              Check these (not auto-merged)
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-amber-200 bg-amber-50">
              {list.unmatched.map((line) => (
                <CheckRow
                  key={line.key}
                  label={line.label}
                  checked={checked.has(line.key)}
                  onToggle={() => toggleChecked(line.key)}
                />
              ))}
            </ul>
          </div>
        )}

        {list.unquantified.length > 0 && (
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-600">Also (no quantity given):</span>{' '}
            {list.unquantified.join(', ')}
          </p>
        )}

        {/* Manual extras */}
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Extras
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addExtra(extraText)
              setExtraText('')
            }}
            className="mt-1.5 flex gap-2"
          >
            <input
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder="Add anything else…"
              className="flex-1 rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              Add
            </button>
          </form>
          {extras.length > 0 && (
            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
              {extras.map((e, i) => (
                <CheckRow
                  key={i}
                  label={e.text}
                  checked={e.checked}
                  onToggle={() => toggleExtra(i)}
                  onRemove={() => removeExtra(i)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Store cupboard */}
        {list.basics.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Store cupboard <span className="font-normal text-stone-400">· assumed in</span>
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50">
              {list.basics.map((b) => {
                const key = `basic|${b}`
                return (
                  <CheckRow
                    key={key}
                    label={b}
                    muted
                    checked={checked.has(key)}
                    onToggle={() => toggleChecked(key)}
                  />
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function CheckRow({
  label,
  detail,
  checked,
  onToggle,
  onRemove,
  muted,
}: {
  label: string
  detail?: string
  checked: boolean
  onToggle: () => void
  onRemove?: () => void
  muted?: boolean
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <label className="flex flex-1 cursor-pointer items-center gap-3 select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="size-4 accent-orange-500"
        />
        <span className="min-w-0">
          <span
            className={`block ${
              checked ? 'text-stone-400 line-through' : muted ? 'text-stone-500' : 'text-stone-800'
            }`}
          >
            {label}
          </span>
          {detail && (
            <span className={`block text-xs ${checked ? 'text-stone-300' : 'text-stone-400'}`}>
              {detail}
            </span>
          )}
        </span>
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          title="Remove"
        >
          ✕
        </button>
      )}
    </li>
  )
}
