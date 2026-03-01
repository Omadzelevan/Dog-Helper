import cors from 'cors'
import express from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.API_PORT || 8787)
const HOST = process.env.API_HOST || '127.0.0.1'
const DATA_FILE = process.env.DATA_FILE || path.resolve('server/data/pins.json')

const ALLOWED_CATEGORIES = new Set(['sos', 'stray', 'adoption', 'help'])
const ALLOWED_STATUSES = new Set(['active', 'resolved'])
const USER_TOKEN_HEADER = 'x-user-token'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))

let writeChain = Promise.resolve()
const subscribers = new Set()

function normalizePin(input) {
  const nowIso = new Date().toISOString()
  const category = ALLOWED_CATEGORIES.has(input?.category) ? input.category : 'stray'
  const status = ALLOWED_STATUSES.has(input?.status) ? input.status : 'active'
  const lat = Number.isFinite(input?.lat) ? Number(input.lat) : null
  const lng = Number.isFinite(input?.lng) ? Number(input.lng) : null

  return {
    id: typeof input?.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    category,
    status,
    title: typeof input?.title === 'string' ? input.title.trim() : '',
    description: typeof input?.description === 'string' ? input.description : '',
    contactName: typeof input?.contactName === 'string' ? input.contactName : '',
    contactPhone: typeof input?.contactPhone === 'string' ? input.contactPhone : '',
    contactLink: typeof input?.contactLink === 'string' ? input.contactLink : '',
    photoDataUrl: typeof input?.photoDataUrl === 'string' ? input.photoDataUrl : '',
    ownerToken: typeof input?.ownerToken === 'string' ? input.ownerToken : '',
    lat,
    lng,
    createdAt: typeof input?.createdAt === 'string' ? input.createdAt : nowIso,
    updatedAt: typeof input?.updatedAt === 'string' ? input.updatedAt : nowIso,
  }
}

function getUserToken(req) {
  const token = req.header(USER_TOKEN_HEADER)
  if (typeof token !== 'string') return ''
  const trimmed = token.trim()
  return trimmed.length >= 12 ? trimmed : ''
}

function toPublicPin(pin, userToken) {
  const { ownerToken, ...safe } = pin
  return {
    ...safe,
    canEdit: Boolean(ownerToken && userToken && ownerToken === userToken),
  }
}

function hasValidPin(pin) {
  return Boolean(pin?.title && Number.isFinite(pin?.lat) && Number.isFinite(pin?.lng))
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8')
  }
}

async function readPins() {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizePin)
  } catch {
    return []
  }
}

async function writePins(pins) {
  const payload = JSON.stringify(pins, null, 2)
  const tmp = `${DATA_FILE}.tmp`
  await fs.writeFile(tmp, `${payload}\n`, 'utf8')
  await fs.rename(tmp, DATA_FILE)
}

function withWriteLock(task) {
  writeChain = writeChain.then(task, task)
  return writeChain
}

function publish(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
  for (const client of subscribers) {
    client.write(message)
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  res.write('event: ready\ndata: {"ok":true}\n\n')
  subscribers.add(res)

  req.on('close', () => {
    subscribers.delete(res)
  })
})

app.get('/api/pins', async (_req, res) => {
  const userToken = getUserToken(_req)
  const pins = await readPins()
  res.json({ pins: pins.map((pin) => toPublicPin(pin, userToken)) })
})

app.get('/api/pins/:id', async (req, res) => {
  const userToken = getUserToken(req)
  const pins = await readPins()
  const pin = pins.find((item) => item.id === req.params.id)
  if (!pin) {
    res.status(404).json({ error: 'Pin not found' })
    return
  }
  res.json({ pin: toPublicPin(pin, userToken) })
})

app.post('/api/pins', async (req, res) => {
  const userToken = getUserToken(req)
  if (!userToken) {
    res.status(401).json({ error: 'არ ხართ ავტორიზებული ამ ქეისის შესაქმნელად.' })
    return
  }

  const incoming = normalizePin({
    ...req.body,
    id: crypto.randomUUID(),
    ownerToken: userToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  if (!hasValidPin(incoming)) {
    res.status(400).json({ error: 'title, lat and lng are required' })
    return
  }

  const pin = await withWriteLock(async () => {
    const pins = await readPins()
    pins.unshift(incoming)
    await writePins(pins)
    return incoming
  })

  publish('pins_changed', { type: 'created', id: pin.id })
  res.status(201).json({ pin: toPublicPin(pin, userToken) })
})

app.patch('/api/pins/:id', async (req, res) => {
  const userToken = getUserToken(req)
  if (!userToken) {
    res.status(401).json({ error: 'არ ხართ ავტორიზებული რედაქტირებისთვის.' })
    return
  }

  const updated = await withWriteLock(async () => {
    const pins = await readPins()
    const index = pins.findIndex((item) => item.id === req.params.id)
    if (index === -1) return null
    if (pins[index].ownerToken !== userToken) return { forbidden: true }

    const next = normalizePin({
      ...pins[index],
      ...req.body,
      id: pins[index].id,
      ownerToken: pins[index].ownerToken,
      createdAt: pins[index].createdAt,
      updatedAt: new Date().toISOString(),
    })

    if (!hasValidPin(next)) {
      return { error: 'title, lat and lng are required' }
    }

    pins[index] = next
    await writePins(pins)
    return next
  })

  if (!updated) {
    res.status(404).json({ error: 'Pin not found' })
    return
  }
  if (updated.forbidden) {
    res.status(403).json({ error: 'ამ ქეისის რედაქტირება მხოლოდ ავტორს შეუძლია.' })
    return
  }
  if (updated.error) {
    res.status(400).json(updated)
    return
  }

  publish('pins_changed', { type: 'updated', id: updated.id })
  res.json({ pin: toPublicPin(updated, userToken) })
})

app.delete('/api/pins/:id', async (req, res) => {
  const userToken = getUserToken(req)
  if (!userToken) {
    res.status(401).json({ error: 'არ ხართ ავტორიზებული წასაშლელად.' })
    return
  }

  const deleted = await withWriteLock(async () => {
    const pins = await readPins()
    const index = pins.findIndex((item) => item.id === req.params.id)
    if (index === -1) return null
    if (pins[index].ownerToken !== userToken) return { forbidden: true }
    const [removed] = pins.splice(index, 1)
    await writePins(pins)
    return removed
  })

  if (!deleted) {
    res.status(404).json({ error: 'Pin not found' })
    return
  }
  if (deleted.forbidden) {
    res.status(403).json({ error: 'ამ ქეისის წაშლა მხოლოდ ავტორს შეუძლია.' })
    return
  }

  publish('pins_changed', { type: 'deleted', id: deleted.id })
  res.json({ ok: true })
})

app.use((err, _req, res, next) => {
  void next
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'ფოტო ძალიან დიდია. სცადეთ პატარა ფოტო.' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, HOST, () => {
  console.log(`Dog Helper API listening on http://${HOST}:${PORT}`)
})
