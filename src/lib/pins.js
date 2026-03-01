export const PIN_CATEGORIES = /** @type {const} */ ({
  sos: {
    id: 'sos',
    label: 'SOS / გადაუდებელი',
    color: '#ef4444',
  },
  stray: {
    id: 'stray',
    label: 'უსახლკარო',
    color: '#f59e0b',
  },
  adoption: {
    id: 'adoption',
    label: 'გასაჩუქებელი',
    color: '#22c55e',
  },
  help: {
    id: 'help',
    label: 'დახმარება სჭირდება',
    color: '#3b82f6',
  },
})

export const PIN_STATUSES = /** @type {const} */ ({
  active: { id: 'active', label: 'აქტიური' },
  resolved: { id: 'resolved', label: 'მოგვარებული' },
})

export const DEFAULT_MAP_VIEW = {
  center: { lat: 41.7151, lng: 44.8271 }, // Tbilisi
  zoom: 7,
}

function createId() {
  const hasCrypto = typeof globalThis !== 'undefined' && globalThis.crypto
  if (hasCrypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  const random = Math.random().toString(36).slice(2)
  const ts = Date.now().toString(36)
  return `pin_${ts}_${random}`
}

export function createEmptyPin() {
  return {
    id: createId(),
    category: 'stray',
    status: 'active',
    canEdit: true,
    title: '',
    description: '',
    contactName: '',
    contactPhone: '',
    contactLink: '',
    photoDataUrl: '',
    lat: null,
    lng: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function normalizePin(input) {
  const nowIso = new Date().toISOString()
  const id = typeof input?.id === 'string' && input.id ? input.id : createId()
  const category = PIN_CATEGORIES[input?.category]?.id ? input.category : 'stray'
  const status = PIN_STATUSES[input?.status]?.id ? input.status : 'active'
  const lat = Number.isFinite(input?.lat) ? Number(input.lat) : null
  const lng = Number.isFinite(input?.lng) ? Number(input.lng) : null

  return {
    id,
    category,
    status,
    canEdit: Boolean(input?.canEdit),
    title: typeof input?.title === 'string' ? input.title : '',
    description: typeof input?.description === 'string' ? input.description : '',
    contactName: typeof input?.contactName === 'string' ? input.contactName : '',
    contactPhone: typeof input?.contactPhone === 'string' ? input.contactPhone : '',
    contactLink: typeof input?.contactLink === 'string' ? input.contactLink : '',
    photoDataUrl: typeof input?.photoDataUrl === 'string' ? input.photoDataUrl : '',
    lat,
    lng,
    createdAt: typeof input?.createdAt === 'string' ? input.createdAt : nowIso,
    updatedAt: typeof input?.updatedAt === 'string' ? input.updatedAt : nowIso,
  }
}

export function pinHasLocation(pin) {
  return Number.isFinite(pin?.lat) && Number.isFinite(pin?.lng)
}
