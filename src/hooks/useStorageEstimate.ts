import { useCallback, useEffect, useState } from 'react'
import { storageDisplay, type StorageDisplay, type StorageInfo } from '../lib/storageEstimate'

// Reads the browser's storage figures (navigator.storage) for the Config → Storage card.
// Everything degrades quietly where unsupported or refused — this is informational, never a
// blocker. The pure shaping lives in ../lib/storageEstimate (unit-tested); this hook is just
// the async wiring + a manual "request persistence" action.

const UNSUPPORTED: StorageInfo = {
  supported: false,
  persisted: false,
  usage: null,
  quota: null,
}

async function read(): Promise<StorageInfo> {
  const s = navigator.storage
  if (!s || typeof s.estimate !== 'function') return UNSUPPORTED
  const [est, persisted] = await Promise.all([
    s.estimate().catch(() => ({}) as StorageEstimate),
    typeof s.persisted === 'function' ? s.persisted().catch(() => false) : Promise.resolve(false),
  ])
  return {
    supported: true,
    persisted: Boolean(persisted),
    usage: est.usage ?? null,
    quota: est.quota ?? null,
  }
}

export interface UseStorageEstimate {
  /** null while the first read is in flight. */
  display: StorageDisplay | null
  loading: boolean
  /** True only when persistence can still be requested (supported + not already granted). */
  canRequestPersist: boolean
  /** Requests persistence and resolves to whether it's granted afterwards (browsers may decline). */
  requestPersist: () => Promise<boolean>
}

export function useStorageEstimate(): UseStorageEstimate {
  const [info, setInfo] = useState<StorageInfo | null>(null)

  const refresh = useCallback(() => {
    read()
      .then(setInfo)
      .catch(() => setInfo(UNSUPPORTED))
  }, [])

  useEffect(refresh, [refresh])

  const requestPersist = useCallback(async () => {
    let granted = false
    try {
      if (navigator.storage?.persist) granted = await navigator.storage.persist()
    } catch {
      // ignore — refusal or unsupported; the fresh read below reflects the real state.
    }
    setInfo(await read().catch(() => UNSUPPORTED))
    return granted
  }, [])

  return {
    display: info ? storageDisplay(info) : null,
    loading: info === null,
    canRequestPersist: Boolean(navigator.storage?.persist) && Boolean(info?.supported) && !info?.persisted,
    requestPersist,
  }
}
