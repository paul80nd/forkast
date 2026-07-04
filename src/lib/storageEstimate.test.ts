import { describe, expect, it } from 'vitest'
import { formatBytes, imageBreakdown, storageDisplay } from './storageEstimate'

describe('formatBytes', () => {
  it('shows bytes below 1 kB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
  })

  it('steps up through decimal units', () => {
    expect(formatBytes(1000)).toBe('1.0 kB')
    expect(formatBytes(1_500_000)).toBe('1.5 MB')
    expect(formatBytes(1_000_000_000)).toBe('1.0 GB')
  })

  it('drops the decimal at 10 and above', () => {
    expect(formatBytes(12_000_000_000)).toBe('12 GB')
  })
})

describe('storageDisplay', () => {
  it('derives usage, quota and percent when both are known', () => {
    const d = storageDisplay({
      supported: true,
      persisted: true,
      usage: 1_000_000_000,
      quota: 12_000_000_000,
    })
    expect(d.usageBytes).toBe(1_000_000_000)
    expect(d.usageLabel).toBe('1.0 GB')
    expect(d.quotaLabel).toBe('12 GB')
    expect(d.percent).toBeCloseTo(8.33, 1)
    expect(d.percentLabel).toBe('8%')
    expect(d.barPct).toBeCloseTo(8.33, 1)
    expect(d.persist.tone).toBe('ok')
  })

  it('warns when persistence is not granted', () => {
    const d = storageDisplay({ supported: true, persisted: false, usage: 5, quota: 100 })
    expect(d.persist.tone).toBe('warn')
  })

  it('rounds tiny non-zero usage up to <1%, and exact zero to 0%', () => {
    expect(storageDisplay({ supported: true, persisted: false, usage: 1, quota: 1_000_000 }).percentLabel).toBe('<1%')
    expect(storageDisplay({ supported: true, persisted: false, usage: 0, quota: 1_000_000 }).percentLabel).toBe('0%')
  })

  it('degrades gracefully when the quota is unknown', () => {
    const d = storageDisplay({ supported: true, persisted: true, usage: 1_000_000, quota: null })
    expect(d.usageBytes).toBe(1_000_000)
    expect(d.usageLabel).toBe('1.0 MB')
    expect(d.quotaLabel).toBe('—')
    expect(d.percent).toBeNull()
    expect(d.percentLabel).toBe('')
    expect(d.barPct).toBe(0)
  })
})

describe('imageBreakdown', () => {
  it('returns null when nothing is cached', () => {
    expect(imageBreakdown(null, 1000)).toBeNull()
    expect(imageBreakdown(0, 1000)).toBeNull()
  })

  it('reports the cache size as a subset when usage exceeds it', () => {
    expect(imageBreakdown(1_000_000_000, 1_500_000_000)).toEqual({
      label: '1.0 GB',
      underReported: false,
    })
  })

  it('flags under-reporting when the measured cache exceeds reported usage', () => {
    // The real case: browser says 88 MB used, but the image cache alone is 1.0 GB.
    expect(imageBreakdown(1_000_000_000, 88_000_000)).toEqual({
      label: '1.0 GB',
      underReported: true,
    })
  })

  it('is not flagged as under-reported when usage is unknown', () => {
    expect(imageBreakdown(1_000_000_000, null)).toEqual({
      label: '1.0 GB',
      underReported: false,
    })
  })
})
