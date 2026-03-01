import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { DEFAULT_MAP_VIEW, PIN_CATEGORIES, pinHasLocation } from '../lib/pins.js'

function makePinDivIcon(category, { dimmed = false } = {}) {
  const color = PIN_CATEGORIES[category]?.color ?? '#64748b'
  const html = `<div class="dh-pin" style="--dh-pin:${color};${dimmed ? '--dh-dim:1;' : ''}"></div>`
  return L.divIcon({
    className: 'dh-pinIcon',
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function makePickerIcon() {
  return L.divIcon({
    className: 'dh-pinIcon',
    html: '<div class="dh-pickerPin"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function LeafletMap({
  pins,
  selectedPinId,
  isPickingLocation,
  draftPin,
  onDraftLocationChange,
  onConfirmPick,
  onCancelPick,
  onSelectPin,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const markersRef = useRef(new Map())
  const pickerMarkerRef = useRef(null)

  const pinsWithLocation = useMemo(() => pins.filter(pinHasLocation), [pins])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const container = containerRef.current
    if (container._leaflet_id) {
      container._leaflet_id = null
    }

    const markers = markersRef.current
    const map = L.map(container, {
      zoomControl: false,
      maxZoom: 19,
    }).setView([DEFAULT_MAP_VIEW.center.lat, DEFAULT_MAP_VIEW.center.lng], DEFAULT_MAP_VIEW.zoom)

    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    if (typeof L.markerClusterGroup === 'function') {
      const clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: true,
        maxClusterRadius: 45,
      })
      clusterGroup.addTo(map)
      clusterRef.current = clusterGroup
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      pickerMarkerRef.current = null
      markers.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const existing = markersRef.current
    const cluster = clusterRef.current
    const layerTarget = cluster || map
    const nextIds = new Set(pinsWithLocation.map((p) => p.id))

    for (const pin of pinsWithLocation) {
      const prev = existing.get(pin.id)
      const isResolved = pin.status === 'resolved'
      const icon = makePinDivIcon(pin.category, { dimmed: isResolved })

      if (!prev) {
        const marker = L.marker([pin.lat, pin.lng], { icon })
        marker.on('click', () => onSelectPin?.(pin.id))
        marker.addTo(layerTarget)
        existing.set(pin.id, marker)
      } else {
        prev.setLatLng([pin.lat, pin.lng])
        prev.setIcon(icon)
      }
    }

    for (const [id, marker] of existing.entries()) {
      if (!nextIds.has(id)) {
        marker.remove()
        existing.delete(id)
      }
    }
  }, [pinsWithLocation, onSelectPin])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!isPickingLocation) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove()
        pickerMarkerRef.current = null
      }
      return
    }

    const ensurePickerMarker = () => {
      if (pickerMarkerRef.current) return pickerMarkerRef.current
      const initialLat = pinHasLocation(draftPin) ? draftPin.lat : DEFAULT_MAP_VIEW.center.lat
      const initialLng = pinHasLocation(draftPin) ? draftPin.lng : DEFAULT_MAP_VIEW.center.lng
      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: makePickerIcon(),
      }).addTo(map)

      marker.on('dragend', () => {
        const latLng = marker.getLatLng()
        onDraftLocationChange?.({ lat: latLng.lat, lng: latLng.lng })
      })
      pickerMarkerRef.current = marker
      return marker
    }

    const pickerMarker = ensurePickerMarker()
    if (pinHasLocation(draftPin)) {
      pickerMarker.setLatLng([draftPin.lat, draftPin.lng])
    } else {
      onDraftLocationChange?.({
        lat: pickerMarker.getLatLng().lat,
        lng: pickerMarker.getLatLng().lng,
      })
    }

    const pickAt = (latlng) => {
      if (!latlng) return
      const { lat, lng } = latlng
      const marker = ensurePickerMarker()
      marker.setLatLng([lat, lng])
      onDraftLocationChange?.({ lat, lng })
    }

    const onClick = (e) => pickAt(e?.latlng)
    const onTouchStart = (e) => pickAt(e?.latlng)

    map.on('click', onClick)
    map.on('touchstart', onTouchStart)
    return () => {
      map.off('click', onClick)
      map.off('touchstart', onTouchStart)
    }
  }, [isPickingLocation, draftPin, onDraftLocationChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!selectedPinId) return
    const marker = markersRef.current.get(selectedPinId)
    if (!marker) return
    const cluster = clusterRef.current
    if (cluster?.zoomToShowLayer) {
      cluster.zoomToShowLayer(marker, () => map.panTo(marker.getLatLng(), { animate: true }))
      return
    }
    map.panTo(marker.getLatLng(), { animate: true })
  }, [selectedPinId])

  const hasLeaflet = true

  return (
    <div className="dh-mapWrap">
      {!hasLeaflet ? (
        <div className="dh-mapFallback">
          Leaflet ვერ ჩაიტვირთა. შეამოწმეთ ინტერნეტი და გადატვირთეთ გვერდი.
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={['dh-map', isPickingLocation ? 'dh-map--picking' : ''].join(' ')}
        aria-label="Georgia map"
      />
      {isPickingLocation ? (
        <>
          <div className="dh-pickHint">დააწკაპუნეთ ან გადაათრიეთ ცისფერი პინი ზუსტი მდებარეობისთვის</div>
          <div className="dh-pickActions">
            <button type="button" className="dh-btn" onClick={onCancelPick}>
              ფორმაზე დაბრუნება
            </button>
            <button
              type="button"
              className="dh-btn dh-btn--primary"
              disabled={!pinHasLocation(draftPin)}
              onClick={onConfirmPick}
            >
              არჩეულია
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
