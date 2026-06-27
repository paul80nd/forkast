import { db } from '../db/db'
import type { ShoppingState } from '../schema/userData'
import { CURRENT_PLAN_ID } from './plan'

// Tick-off + manual extras are scoped to the current plan.
async function get(): Promise<ShoppingState> {
  return (
    (await db.shopping.get(CURRENT_PLAN_ID)) ?? {
      id: CURRENT_PLAN_ID,
      checked: [],
      extras: [],
    }
  )
}

export async function toggleChecked(key: string): Promise<void> {
  const s = await get()
  const checked = s.checked.includes(key)
    ? s.checked.filter((k) => k !== key)
    : [...s.checked, key]
  await db.shopping.put({ ...s, checked })
}

export async function clearChecked(): Promise<void> {
  const s = await get()
  await db.shopping.put({ ...s, checked: [] })
}

export async function addExtra(text: string): Promise<void> {
  const t = text.trim()
  if (!t) return
  const s = await get()
  await db.shopping.put({ ...s, extras: [...s.extras, { text: t, checked: false }] })
}

export async function toggleExtra(index: number): Promise<void> {
  const s = await get()
  const extras = s.extras.map((e, i) =>
    i === index ? { ...e, checked: !e.checked } : e,
  )
  await db.shopping.put({ ...s, extras })
}

export async function removeExtra(index: number): Promise<void> {
  const s = await get()
  await db.shopping.put({ ...s, extras: s.extras.filter((_, i) => i !== index) })
}
