import type { ReactNode } from 'react'

/**
 * A tappable list line that checks off — recipe ingredients (mise en place) and method steps
 * (forkast-design). The whole row is the control (role=checkbox, keyboard-operable); checked
 * lines strike through and mute. `marker="box"` renders a checkbox, `marker="step"` a numbered
 * circle (pass `index`). An optional `trailing` node sits at the end (e.g. the parsed amount).
 * Wrap in a plain <ul>/<ol>. The brand-700 fill keeps the white glyph legible in both themes.
 */
export function CheckItem({
  checked,
  onToggle,
  children,
  trailing,
  marker = 'box',
  index,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  trailing?: ReactNode
  marker?: 'box' | 'step'
  index?: number
}) {
  const mark =
    marker === 'step' ? (
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          checked ? 'bg-brand-700 text-white' : 'bg-brand-tint text-brand-ink'
        }`}
      >
        {checked ? '✓' : index}
      </span>
    ) : (
      <span
        className={`flex size-[18px] shrink-0 items-center justify-center rounded-sm border text-[11px] text-white ${
          checked ? 'border-brand-700 bg-brand-700' : 'border-line-strong'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
    )
  return (
    <li className="list-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className={`flex w-full gap-2.5 py-1.5 text-left ${
          marker === 'step' ? 'items-start' : 'items-center'
        }`}
      >
        {mark}
        <span
          className={`flex-1 leading-normal ${checked ? 'text-muted line-through' : 'text-ink'}`}
        >
          {children}
        </span>
        {trailing}
      </button>
    </li>
  )
}
