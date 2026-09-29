import { useEffect, useRef } from 'react'

/**
 * Keeps `data` (any JSON-serialisable snapshot of the whole form) mirrored into
 * localStorage under `key`, debounced, so that if the network drops or the
 * page is accidentally reloaded while filling the form, nothing is lost.
 *
 * - `enabled`  – pass false while the real record is still loading from the
 *                server, so we don't overwrite a draft with empty defaults.
 * - Call `clearDraft()` (returned) once the data has been safely saved to the
 *   backend, so the local copy doesn't linger and get restored again later.
 */
export default function useDraftAutosave(key, data, enabled = true) {
  const timer = useRef(null)

  useEffect(() => {
    if (!enabled) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }))
      } catch {
        // localStorage full/unavailable — nothing we can do, fail silently
      }
    }, 400)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, JSON.stringify(data)])

  const clearDraft = () => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }

  return { clearDraft }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data ?? null
  } catch {
    return null
  }
}
