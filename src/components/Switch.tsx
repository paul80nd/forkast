import type { ReactNode } from 'react'

/**
 * An on/off toggle switch (forkast-design). Use for a setting that takes effect
 * immediately and reads as persistent state (Browse's "Group variants", Plan's
 * "Include unrated"). For a selection within a form, or an item in a multi-select
 * list you tick through (Shop tick-list, Browse bulk-select, Refine delete-picks),
 * use a checkbox (.fk-check) instead. The track fills brand green when on.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  title,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
  className?: string
  title?: string
}) {
  return (
    <label
      title={title}
      className={`inline-flex items-center gap-2 text-sm text-muted select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-[22px] w-[38px] flex-none items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-brand' : 'bg-line-strong'
        }`}
      >
        <span
          className={`h-[18px] w-[18px] rounded-full bg-white shadow-xs transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label}
    </label>
  )
}
