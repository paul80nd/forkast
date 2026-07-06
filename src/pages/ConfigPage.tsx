import { useState } from 'react'
import { ImportDataset } from '../components/ImportDataset'
import { BackupRestore } from '../components/BackupRestore'
import { StorageUsage } from '../components/StorageUsage'
import { RecipeImages } from '../components/RecipeImages'
import { IngredientManager } from '../components/IngredientManager'
import { TagManager } from '../components/TagManager'

type Tab = 'general' | 'ingredients' | 'labels'

const TAB_LABELS: Record<Tab, string> = {
  general: 'General',
  ingredients: 'Ingredients',
  labels: 'Tags & allergens',
}

export function ConfigPage() {
  const [tab, setTab] = useState<Tab>('general')

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Config</h1>

      <div className="mt-4 flex gap-1 border-b border-line">
        {(['general', 'ingredients', 'labels'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'border-brand-500 text-brand-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'general' ? (
          <GeneralTab />
        ) : tab === 'ingredients' ? (
          <IngredientManager />
        ) : (
          <TagManager />
        )}
      </div>
    </section>
  )
}

function GeneralTab() {
  return (
    <div className="space-y-4">
      <ImportDataset />
      <BackupRestore />
      <StorageUsage />
      <RecipeImages />
    </div>
  )
}
