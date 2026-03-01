import { useMemo, useState } from 'react'
import { PIN_CATEGORIES, PIN_STATUSES, pinHasLocation } from '../lib/pins.js'
import { fileToDataUrl } from '../lib/fileToDataUrl.js'

export default function PinModal({
  open,
  pin,
  onChangePin,
  isPickingLocation,
  onStartPickLocation,
  onCancelPickLocation,
  onClose,
  onSave,
}) {
  const [error, setError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categoryOptions = useMemo(() => Object.values(PIN_CATEGORIES), [])
  const statusOptions = useMemo(() => Object.values(PIN_STATUSES), [])

  if (!open || !pin) return null

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!pinHasLocation(pin)) {
      setError('მდებარეობა სავალდებულოა (დააწკაპუნეთ „რუკაზე არჩევა“).')
      return
    }
    if (!pin.title.trim()) {
      setError('სათაური სავალდებულოა.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onSave?.(pin)
    } catch (submitError) {
      setError(submitError?.message || 'შენახვა ვერ მოხერხდა.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file, {
        maxWidth: 1440,
        maxHeight: 1440,
        quality: 0.8,
      })
      onChangePin?.({ ...pin, photoDataUrl: dataUrl, updatedAt: new Date().toISOString() })
      setError('')
    } catch {
      setError('ფოტოს დამუშავება ვერ მოხერხდა. სცადეთ სხვა ფოტო.')
    }
  }

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('თქვენს ბრაუზერში geolocation არ არის ხელმისაწვდომი.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        onChangePin?.({ ...pin, lat, lng, updatedAt: new Date().toISOString() })
        setIsLocating(false)
        setError('')
      },
      () => {
        setIsLocating(false)
        setError('მდებარეობის მიღება ვერ მოხერხდა. შეამოწმეთ browser permissions.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div
      className={['dh-modalOverlay', isPickingLocation ? 'dh-modalOverlay--picking' : ''].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Add pin"
    >
      <div className="dh-modal">
        <div className="dh-modalHeader">
          <div className="dh-modalTitle">{pin?.id ? 'ქეისის დამატება / რედაქტირება' : 'ქეისის დამატება'}</div>
          <button type="button" className="dh-btn dh-btn--ghost" onClick={onClose}>
            დახურვა
          </button>
        </div>

        <form className="dh-form" onSubmit={onSubmit}>
          <div className="dh-row">
            <label className="dh-field">
              <div className="dh-label">კატეგორია</div>
              <select
                value={pin.category}
                onChange={(e) =>
                  onChangePin?.({ ...pin, category: e.target.value, updatedAt: new Date().toISOString() })
                }
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="dh-field">
              <div className="dh-label">სტატუსი</div>
              <select
                value={pin.status}
                onChange={(e) =>
                  onChangePin?.({ ...pin, status: e.target.value, updatedAt: new Date().toISOString() })
                }
              >
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="dh-field">
            <div className="dh-label">სათაური</div>
            <input
              value={pin.title}
              onChange={(e) =>
                onChangePin?.({ ...pin, title: e.target.value, updatedAt: new Date().toISOString() })
              }
              placeholder="მაგ: ავარია, შიმშილი, დროებითი თავშესაფარი..."
            />
          </label>

          <label className="dh-field">
            <div className="dh-label">აღწერა</div>
            <textarea
              rows={4}
              value={pin.description}
              onChange={(e) =>
                onChangePin?.({ ...pin, description: e.target.value, updatedAt: new Date().toISOString() })
              }
              placeholder="დეტალები, მდგომარეობა, რა დახმარება სჭირდება..."
            />
          </label>

          <div className="dh-row">
            <label className="dh-field">
              <div className="dh-label">კონტაქტი (სახელი)</div>
              <input
                value={pin.contactName}
                onChange={(e) =>
                  onChangePin?.({ ...pin, contactName: e.target.value, updatedAt: new Date().toISOString() })
                }
              />
            </label>
            <label className="dh-field">
              <div className="dh-label">ტელეფონი</div>
              <input
                value={pin.contactPhone}
                onChange={(e) =>
                  onChangePin?.({ ...pin, contactPhone: e.target.value, updatedAt: new Date().toISOString() })
                }
                placeholder="+995..."
              />
            </label>
          </div>

          <label className="dh-field">
            <div className="dh-label">ლინკი (Facebook/Instagram/Telegram)</div>
            <input
              value={pin.contactLink}
              onChange={(e) =>
                onChangePin?.({ ...pin, contactLink: e.target.value, updatedAt: new Date().toISOString() })
              }
              placeholder="https://..."
            />
          </label>

          <div className="dh-row dh-row--location">
            <div className="dh-field">
              <div className="dh-label">მდებარეობა</div>
              <div className="dh-locationLine">
                <span className="dh-locationText">
                  {pinHasLocation(pin) ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'არ არის არჩეული'}
                </span>
                {!isPickingLocation ? (
                  <button type="button" className="dh-btn dh-btn--secondary" onClick={onStartPickLocation}>
                    რუკაზე არჩევა
                  </button>
                ) : (
                  <button type="button" className="dh-btn dh-btn--secondary" onClick={onCancelPickLocation}>
                    გაუქმება
                  </button>
                )}
              </div>
              <div className="dh-row dh-row--coords">
                <label className="dh-field">
                  <div className="dh-label">Latitude</div>
                  <input
                    type="number"
                    step="0.000001"
                    value={pin.lat ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      onChangePin?.({
                        ...pin,
                        lat: value === '' ? null : Number(value),
                        updatedAt: new Date().toISOString(),
                      })
                    }}
                    placeholder="41.71510"
                  />
                </label>
                <label className="dh-field">
                  <div className="dh-label">Longitude</div>
                  <input
                    type="number"
                    step="0.000001"
                    value={pin.lng ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      onChangePin?.({
                        ...pin,
                        lng: value === '' ? null : Number(value),
                        updatedAt: new Date().toISOString(),
                      })
                    }}
                    placeholder="44.82710"
                  />
                </label>
              </div>
              <div className="dh-locationActions">
                <button
                  type="button"
                  className="dh-btn dh-btn--secondary"
                  disabled={isLocating}
                  onClick={onUseCurrentLocation}
                >
                  {isLocating ? 'ვიღებ მდებარეობას...' : 'ჩემი მდებარეობა'}
                </button>
                <button
                  type="button"
                  className="dh-btn"
                  onClick={() =>
                    onChangePin?.({ ...pin, lat: null, lng: null, updatedAt: new Date().toISOString() })
                  }
                >
                  კოორდინატების გასუფთავება
                </button>
              </div>
            </div>
          </div>

          <label className="dh-field">
            <div className="dh-label">ფოტო</div>
            <input type="file" accept="image/*" onChange={onPhotoChange} />
            {pin.photoDataUrl ? <img className="dh-photoPreview" alt="Preview" src={pin.photoDataUrl} /> : null}
          </label>

          {error ? <div className="dh-error">{error}</div> : null}

          <div className="dh-actions">
            <button type="submit" className="dh-btn dh-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'ინახება...' : 'შენახვა'}
            </button>
            <button type="button" className="dh-btn" onClick={onClose} disabled={isSubmitting}>
              გაუქმება
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
