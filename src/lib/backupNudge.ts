// Shared backup-staleness logic, used by both the Config Backup card and the header
// nudge. Pure (bar reading "today" via daysSince) so it can be unit-tested.

import { daysSince } from './plan'

// How old (days) a backup can get before we nudge. A week: long enough not to nag after a
// quiet spell, short enough to bound how much curation Safari eviction could cost you.
export const STALE_DAYS = 7

export interface BackupStatus {
  /** 'warn' when there's no backup yet or it's stale — drives the amber styling and the
   *  header indicator's visibility. 'ok' otherwise. */
  tone: 'warn' | 'ok'
  /** Full sentence for the Config card and the header tooltip. */
  text: string
  /** Terse label for the header indicator ("No backup" / "3 days ago"). */
  short: string
}

export function backupStatus(lastAt: string | null): BackupStatus {
  if (!lastAt) {
    return {
      tone: 'warn',
      short: 'No backup yet',
      text: "You haven't saved a backup on this device yet. Safari can clear the app's data — save one to be safe.",
    }
  }
  const days = daysSince(lastAt)
  const ago = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  if (days >= STALE_DAYS) {
    return {
      tone: 'warn',
      short: `Backup ${ago}`,
      text: `Last backup was ${ago}. Save a fresh one to protect recent changes.`,
    }
  }
  return { tone: 'ok', short: `Backup ${ago}`, text: `Last backup: ${ago}.` }
}
