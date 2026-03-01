import './App.css'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import LeafletMap from './components/LeafletMap.jsx'
import PinModal from './components/PinModal.jsx'
import PinSidebar from './components/PinSidebar.jsx'
import { createEmptyPin, pinHasLocation } from './lib/pins.js'
import { usePinsApi } from './lib/usePinsApi.js'

function App() {
  const { pins, isLoading, error, createPin, updatePin, deletePin: deletePinRemote } = usePinsApi()

  const [filters, setFilters] = useState({ q: '', category: 'all', status: 'all' })
  const [selectedPinId, setSelectedPinId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [draftPin, setDraftPin] = useState(null)
  const [isPickingLocation, setIsPickingLocation] = useState(false)
  const deferredFilters = useDeferredValue(filters)
  const mapMainRef = useRef(null)

  useEffect(() => {
    if (!isPickingLocation) return
    mapMainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [isPickingLocation])

  const filteredPins = useMemo(() => {
    const q = deferredFilters.q.trim().toLowerCase()
    const match = (p) => {
      if (deferredFilters.category !== 'all' && p.category !== deferredFilters.category) return false
      if (deferredFilters.status !== 'all' && p.status !== deferredFilters.status) return false
      if (!q) return true
      return `${p.title}\n${p.description}`.toLowerCase().includes(q)
    }

    return [...pins]
      .filter(match)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1
        return String(b.updatedAt).localeCompare(String(a.updatedAt))
      })
  }, [pins, deferredFilters])

  const openAdd = () => {
    const pin = createEmptyPin()
    setDraftPin(pin)
    setModalOpen(true)
    setIsPickingLocation(true)
  }

  const openEdit = (id) => {
    const existing = pins.find((p) => p.id === id)
    if (!existing) return
    setDraftPin({ ...existing })
    setModalOpen(true)
    setIsPickingLocation(false)
  }

  const closeModal = () => {
    setModalOpen(false)
    setDraftPin(null)
    setIsPickingLocation(false)
  }

  const startPickLocation = () => {
    setIsPickingLocation(true)
  }

  const confirmPickLocation = () => {
    if (!pinHasLocation(draftPin)) return
    setIsPickingLocation(false)
  }

  const cancelPickLocation = () => {
    setIsPickingLocation(false)
  }

  const upsertPin = async (pin) => {
    if (pins.some((item) => item.id === pin.id)) {
      const updated = await updatePin(pin.id, pin)
      setSelectedPinId(updated.id)
      return updated
    }
    const created = await createPin(pin)
    setSelectedPinId(created.id)
    return created
  }

  const deletePin = async (id) => {
    if (!confirm('ნამდვილად გსურთ ქეისის წაშლა?')) return
    await deletePinRemote(id)
    setSelectedPinId((cur) => (cur === id ? null : cur))
  }

  const toggleResolved = async (id) => {
    const existing = pins.find((p) => p.id === id)
    if (!existing) return
    await upsertPin({ ...existing, status: existing.status === 'resolved' ? 'active' : 'resolved' })
  }

  const handleDraftLocationChange = useCallback(({ lat, lng }) => {
    setDraftPin((p) => (p ? { ...p, lat, lng, updatedAt: new Date().toISOString() } : p))
  }, [])

  return (
    <div className={['dh-app', isPickingLocation ? 'dh-app--picking' : ''].join(' ')}>
      {error ? <div className="dh-globalError">სერვერთან კავშირი ვერ მოხერხდა: {error}</div> : null}
      <PinSidebar
        pins={filteredPins}
        selectedPinId={selectedPinId}
        filters={filters}
        onChangeFilters={setFilters}
        onAdd={openAdd}
        onSelect={setSelectedPinId}
        onEdit={openEdit}
        onDelete={(id) => deletePin(id).catch((err) => alert(err?.message || 'წაშლა ვერ მოხერხდა'))}
        onToggleResolved={(id) =>
          toggleResolved(id).catch((err) => alert(err?.message || 'სტატუსის შეცვლა ვერ მოხერხდა'))
        }
      />

      <main ref={mapMainRef} className="dh-main" aria-label="Map">
        <LeafletMap
          pins={filteredPins}
          selectedPinId={selectedPinId}
          isPickingLocation={isPickingLocation}
          draftPin={draftPin}
          onDraftLocationChange={handleDraftLocationChange}
          onConfirmPick={confirmPickLocation}
          onCancelPick={cancelPickLocation}
          onSelectPin={setSelectedPinId}
        />
      </main>

      <PinModal
        key={draftPin?.id || 'draft'}
        open={modalOpen && !isPickingLocation}
        pin={draftPin}
        onChangePin={setDraftPin}
        isPickingLocation={isPickingLocation}
        onStartPickLocation={startPickLocation}
        onCancelPickLocation={cancelPickLocation}
        onClose={closeModal}
        onSave={async (pin) => {
          await upsertPin(pin)
          closeModal()
        }}
      />
      {isLoading ? <div className="dh-loading">იტვირთება საერთო ქეისები...</div> : null}
    </div>
  )
}

export default App
