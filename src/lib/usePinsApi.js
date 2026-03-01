import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizePin } from './pins.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const USER_TOKEN_KEY = 'dogHelperUserToken_v1'
let cachedUserToken = ''

function getUserToken() {
  if (cachedUserToken && cachedUserToken.length >= 12) {
    return cachedUserToken
  }

  const hasCrypto = typeof globalThis !== 'undefined' && globalThis.crypto
  const makeToken = () => {
    if (hasCrypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  }

  let token = ''
  try {
    token = localStorage.getItem(USER_TOKEN_KEY) || ''
  } catch {
    token = ''
  }
  if (token && token.length >= 12) {
    cachedUserToken = token
    return token
  }

  token = makeToken()
  cachedUserToken = token
  try {
    localStorage.setItem(USER_TOKEN_KEY, token)
  } catch {
    // ignore storage failures; cached token still works during this session
  }
  return token
}

function withAuthHeaders(extra = {}) {
  return {
    ...extra,
    'x-user-token': getUserToken(),
  }
}

function toPins(payload) {
  const items = Array.isArray(payload?.pins) ? payload.pins : []
  return items.map(normalizePin)
}

export function usePinsApi() {
  const [pins, setPins] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/pins`, {
        headers: withAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to load pins')
      const payload = await response.json()
      setPins(toPins(payload))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pins')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/events`)
    source.addEventListener('pins_changed', () => {
      refresh()
    })
    source.onerror = () => {
      // silent retry by EventSource internals
    }
    return () => source.close()
  }, [refresh])

  const createPin = useCallback(async (pin) => {
    const response = await fetch(`${API_BASE}/pins`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(pin),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error || 'Create failed')
    }
    const payload = await response.json()
    const created = normalizePin(payload.pin)
    setPins((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
    return created
  }, [])

  const updatePin = useCallback(async (id, patch) => {
    const response = await fetch(`${API_BASE}/pins/${id}`, {
      method: 'PATCH',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error || 'Update failed')
    }
    const payload = await response.json()
    const updated = normalizePin(payload.pin)
    setPins((prev) => prev.map((item) => (item.id === id ? updated : item)))
    return updated
  }, [])

  const deletePin = useCallback(async (id) => {
    const response = await fetch(`${API_BASE}/pins/${id}`, {
      method: 'DELETE',
      headers: withAuthHeaders(),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error || 'Delete failed')
    }
    setPins((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return useMemo(
    () => ({
      pins,
      isLoading,
      error,
      refresh,
      createPin,
      updatePin,
      deletePin,
    }),
    [pins, isLoading, error, refresh, createPin, updatePin, deletePin],
  )
}
