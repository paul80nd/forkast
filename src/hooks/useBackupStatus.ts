import { useSyncExternalStore } from 'react'
import { backupStatus, type BackupStatus } from '../lib/backupNudge'

// The last-Save timestamp lives in localStorage (device-local, not in the backup itself:
// it's about this browser's habit, and a restored machine having no record correctly
// prompts a fresh local backup). Both the header nudge and the Config card read it through
// this hook, so a Save updates both at once — useSyncExternalStore re-reads on our custom
// event (same tab) and the storage event (other tabs).

const KEY = 'backup.lastAt'
const EVENT = 'forkast:backup-saved'

function read(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string) : null
  } catch {
    return null
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Record a successful Save (ISO date/time) and notify every subscriber in this tab. */
export function markBackupSaved(iso: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(iso))
  } catch {
    // ignore: storage unavailable (e.g. Safari private mode)
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Live backup-staleness status, recomputed whenever a Save happens. */
export function useBackupStatus(): BackupStatus {
  const lastAt = useSyncExternalStore(subscribe, read, () => null)
  return backupStatus(lastAt)
}
