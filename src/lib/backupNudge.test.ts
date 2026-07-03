import { describe, it, expect } from 'vitest'
import { backupStatus, STALE_DAYS } from './backupNudge'

// Build a yyyy-mm-dd string `n` days before today (what daysSince expects).
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('backupStatus', () => {
  it('warns when there is no backup yet', () => {
    const s = backupStatus(null)
    expect(s.tone).toBe('warn')
    expect(s.short).toBe('No backup yet')
  })

  it('is ok for a recent backup', () => {
    expect(backupStatus(daysAgo(0)).tone).toBe('ok')
    expect(backupStatus(daysAgo(STALE_DAYS - 1)).tone).toBe('ok')
  })

  it('warns once the backup reaches the stale threshold', () => {
    expect(backupStatus(daysAgo(STALE_DAYS)).tone).toBe('warn')
    expect(backupStatus(daysAgo(STALE_DAYS + 5)).tone).toBe('warn')
  })

  it('reads "today" / "yesterday" for the freshest backups', () => {
    expect(backupStatus(daysAgo(0)).text).toContain('today')
    expect(backupStatus(daysAgo(1)).text).toContain('yesterday')
  })
})
