// Pure formatting for the Config → Storage card. The browser numbers come from
// navigator.storage (estimate() + persisted()); this turns them into display strings so the
// component stays a thin shell and the logic is unit-testable. Decimal units (1000-based) to
// match how browsers/OSes report disk budgets ("1.0 GB", not "0.93 GiB").

const UNITS = ['kB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1000) return `${Math.max(0, Math.round(bytes))} B`
  let v = bytes
  let i = -1
  do {
    v /= 1000
    i++
  } while (v >= 1000 && i < UNITS.length - 1)
  // One decimal below 10 (1.0 GB), whole numbers above (12 GB) — reads cleaner.
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${UNITS[i]}`
}

/** Raw reading from navigator.storage; nulls where the browser doesn't report a figure. */
export interface StorageInfo {
  /** navigator.storage.estimate exists (else the whole card degrades to "unsupported"). */
  supported: boolean
  persisted: boolean
  usage: number | null
  quota: number | null
}

export interface StorageDisplay {
  supported: boolean
  persisted: boolean
  usageLabel: string
  quotaLabel: string
  /** 0..100, or null when the quota is unknown. */
  percent: number | null
  percentLabel: string
  /** Clamped 0..100 for the bar width. */
  barPct: number
  persist: { tone: 'ok' | 'warn'; text: string }
}

export function storageDisplay(info: StorageInfo): StorageDisplay {
  const { supported, persisted, usage, quota } = info
  const hasUsage = usage != null && usage >= 0
  const hasQuota = quota != null && quota > 0
  const percent = hasUsage && hasQuota ? (usage / quota) * 100 : null

  const percentLabel =
    percent == null
      ? ''
      : percent === 0
        ? '0%'
        : percent < 0.5
          ? '<1%'
          : `${Math.round(percent)}%`

  return {
    supported,
    persisted,
    usageLabel: hasUsage ? formatBytes(usage) : '—',
    quotaLabel: hasQuota ? formatBytes(quota) : '—',
    percent,
    percentLabel,
    barPct: percent == null ? 0 : Math.min(100, Math.max(0, percent)),
    persist: persisted
      ? {
          tone: 'ok',
          text: 'Persistent storage is granted — the browser won’t automatically clear this app’s data to reclaim space.',
        }
      : {
          tone: 'warn',
          text: 'Persistent storage isn’t granted, so the browser may clear this data if it’s left idle or space runs low. Your saved JSON backup is the durable copy.',
        },
  }
}
