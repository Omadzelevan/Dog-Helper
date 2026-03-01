import { useMemo } from 'react'
import { PIN_CATEGORIES, PIN_STATUSES } from '../lib/pins.js'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString('ka-GE')
  } catch {
    return iso
  }
}

export default function PinSidebar({
  pins,
  selectedPinId,
  filters,
  onChangeFilters,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
  onToggleResolved,
}) {
  const selected = useMemo(() => pins.find((p) => p.id === selectedPinId) || null, [pins, selectedPinId])

  return (
    <aside className="dh-sidebar" aria-label="Pins">
      <div className="dh-top">
        <div className="dh-brand">
          <div className="dh-brandTitle">Dog Helper</div>
          <div className="dh-brandSub">უსახლკარო ძაღლების დახმარება</div>
        </div>
        <button className="dh-btn dh-btn--primary" onClick={onAdd}>
          + ქეისის დამატება
        </button>
      </div>

      <div className="dh-filters">
        <label className="dh-field">
          <div className="dh-label">ძიება</div>
          <input
            value={filters.q}
            onChange={(e) => onChangeFilters({ ...filters, q: e.target.value })}
            placeholder="სათაური ან აღწერა..."
          />
        </label>

        <div className="dh-row">
          <label className="dh-field">
            <div className="dh-label">კატეგორია</div>
            <select
              value={filters.category}
              onChange={(e) => onChangeFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">ყველა</option>
              {Object.values(PIN_CATEGORIES).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dh-field">
            <div className="dh-label">სტატუსი</div>
            <select value={filters.status} onChange={(e) => onChangeFilters({ ...filters, status: e.target.value })}>
              <option value="all">ყველა</option>
              {Object.values(PIN_STATUSES).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="dh-list">
        {pins.length === 0 ? (
          <div className="dh-empty">
            დაამატეთ პირველი ქეისი. „ქეისის დამატება“ → „რუკაზე არჩევა“ → რუკაზე დაჭერა.
          </div>
        ) : (
          pins.map((p) => (
            <button
              key={p.id}
              className={['dh-item', selectedPinId === p.id ? 'dh-item--active' : ''].join(' ')}
              onClick={() => onSelect(p.id)}
            >
              <span className="dh-dot" style={{ background: PIN_CATEGORIES[p.category]?.color ?? '#64748b' }} />
              <span className="dh-itemText">
                <span className="dh-itemTitle">{p.title || '(უსათაურო)'}</span>
                <span className="dh-itemMeta">
                  {PIN_CATEGORIES[p.category]?.label ?? p.category} • {PIN_STATUSES[p.status]?.label ?? p.status}
                  {p.canEdit ? '' : ' • მხოლოდ ნახვა'}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {selected ? (
        <div className="dh-details">
          <div className="dh-detailsHeader">
            <div className="dh-detailsTitle">{selected.title || '(უსათაურო)'}</div>
            <div className="dh-detailsMeta">
              {PIN_CATEGORIES[selected.category]?.label ?? selected.category} • {PIN_STATUSES[selected.status]?.label ?? selected.status}
            </div>
          </div>

          {selected.photoDataUrl ? <img className="dh-detailsPhoto" alt="Photo" src={selected.photoDataUrl} /> : null}

          {selected.description ? <div className="dh-detailsDesc">{selected.description}</div> : null}

          <div className="dh-detailsGrid">
            {selected.contactName ? (
              <div>
                <div className="dh-k">კონტაქტი</div>
                <div className="dh-v">{selected.contactName}</div>
              </div>
            ) : null}
            {selected.contactPhone ? (
              <div>
                <div className="dh-k">ტელეფონი</div>
                <div className="dh-v">{selected.contactPhone}</div>
              </div>
            ) : null}
            {selected.contactLink ? (
              <div>
                <div className="dh-k">ლინკი</div>
                <div className="dh-v">
                  <a href={selected.contactLink} target="_blank" rel="noreferrer">
                    გახსნა
                  </a>
                </div>
              </div>
            ) : null}
            <div>
              <div className="dh-k">განახლდა</div>
              <div className="dh-v">{formatTime(selected.updatedAt)}</div>
            </div>
          </div>

          <div className="dh-detailsActions">
            {selected.canEdit ? (
              <>
                <button className="dh-btn dh-btn--secondary" onClick={() => onEdit(selected.id)}>
                  რედაქტირება
                </button>
                <button className="dh-btn" onClick={() => onToggleResolved(selected.id)}>
                  {selected.status === 'resolved' ? 'აქტიურად მონიშვნა' : 'მოგვარებულად მონიშვნა'}
                </button>
                <button className="dh-btn dh-btn--danger" onClick={() => onDelete(selected.id)}>
                  წაშლა
                </button>
              </>
            ) : (
              <div className="dh-readonlyNote">ეს ქეისი სხვისია — რედაქტირება/წაშლა შეზღუდულია.</div>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
