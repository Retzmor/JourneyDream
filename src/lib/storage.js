import { todayISO, PROFILE_OPTIONS, SITUACION_MAX } from './constants.js'

const DREAMS_KEY = 'dreamjournal:dreams:v1'
const DRAFT_KEY = 'dreamjournal:draft:v1'
const PROFILE_KEY = 'dreamjournal:profile:v1'
const META_KEY = 'dreamjournal:meta_analysis:v1'
const BACKUP_VERSION = 1

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ---------- Helpers de normalización (compartidos con ai.js) ---------- */

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const cleanList = (v, maxItems, maxLen) =>
  Array.isArray(v)
    ? [...new Set(v.filter((s) => typeof s === 'string').map((s) => s.trim().slice(0, maxLen)).filter(Boolean))].slice(0, maxItems)
    : []

const cleanSymbols = (v) => {
  if (!Array.isArray(v)) return []
  const seen = new Set()
  const out = []
  for (const item of v) {
    if (typeof item === 'string') {
      const s = item.trim().slice(0, 80)
      const key = s.toLowerCase()
      if (s && !seen.has(key)) {
        seen.add(key)
        out.push(s)
      }
    } else if (item && typeof item === 'object') {
      const name = cleanStr(item.name, 100)
      const meaning = cleanStr(item.meaning, 600)
      const key = name.toLowerCase()
      if (name && !seen.has(key)) {
        seen.add(key)
        out.push(meaning ? { name, meaning } : name)
      }
    }
    if (out.length >= 12) break
  }
  return out
}

const cleanLucidTip = (v) => {
  if (Array.isArray(v)) {
    const list = cleanList(v, 6, 600)
    return list.length ? list : ''
  }
  return cleanStr(v, 2000)
}

/** Valida el análisis de IA de un sueño. Devuelve null si no es utilizable. */
export function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return null
  const interpretation = cleanStr(raw.interpretation, 12000)
  if (!interpretation) return null
  const reflectionQuestion = cleanStr(raw.reflectionQuestion, 1000)
  return {
    interpretation,
    symbols: cleanSymbols(raw.symbols),
    emotionalTone: cleanStr(raw.emotionalTone, 1000),
    lucidTip: cleanLucidTip(raw.lucidTip),
    ...(reflectionQuestion && { reflectionQuestion }),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  }
}

/** Valida el meta-análisis global. Devuelve null si no es utilizable. */
export function normalizeMetaAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return null
  const report = {
    patterns: cleanList(raw.patterns, 10, 800),
    dreamSigns: cleanList(raw.dreamSigns, 12, 160),
    emotionalEvolution: cleanStr(raw.emotionalEvolution, 4000),
    recommendations: cleanList(raw.recommendations, 10, 800),
    dreamsAnalyzed: Number.isFinite(raw.dreamsAnalyzed) ? raw.dreamsAnalyzed : 0,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  }
  const hasContent =
    report.patterns.length || report.dreamSigns.length || report.emotionalEvolution || report.recommendations.length
  return hasContent ? report : null
}

/** Valida y limpia un sueño proveniente de LocalStorage o de un archivo importado. */
export function normalizeDream(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const description = typeof raw.description === 'string' ? raw.description : ''
  if (!title && !description.trim()) return null

  const lucidity = Math.min(5, Math.max(1, Math.round(Number(raw.lucidity)) || 1))
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean))]
    : []
  const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now()
  // Opcional: los sueños antiguos (sin análisis) conservan exactamente su forma original
  const aiAnalysis = normalizeAnalysis(raw.aiAnalysis)

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    date: typeof raw.date === 'string' && ISO_DATE.test(raw.date) ? raw.date : todayISO(),
    title,
    description,
    lucidity,
    tags,
    createdAt,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt,
    ...(aiAnalysis && { aiAnalysis }),
  }
}

export function loadDreams() {
  try {
    const raw = localStorage.getItem(DREAMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeDream).filter(Boolean) : []
  } catch {
    return []
  }
}

export function saveDreams(dreams) {
  try {
    localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams))
    return true
  } catch {
    return false
  }
}

/** Pide al navegador/WebView que no borre los datos automáticamente. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {
    /* no crítico */
  }
}

/* ---------- Borrador del formulario ---------- */

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* no crítico */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* no crítico */
  }
}

/* ---------- Perfil onírico (solo datos no identificables) ---------- */

export function emptyProfile() {
  return { rangoEdad: '', ocupacionGeneral: '', nivelEstres: 0, situacionActual: '', objetivoOnirico: '' }
}

/** Solo acepta valores de las listas cerradas; cualquier otra cosa se descarta. */
export function normalizeProfile(raw) {
  const base = emptyProfile()
  if (!raw || typeof raw !== 'object') return base
  const pick = (key) => (PROFILE_OPTIONS[key].includes(raw[key]) ? raw[key] : '')
  const stress = Math.round(Number(raw.nivelEstres))
  return {
    ...base,
    rangoEdad: pick('rangoEdad'),
    ocupacionGeneral: pick('ocupacionGeneral'),
    nivelEstres: stress >= 1 && stress <= 5 ? stress : 0,
    situacionActual: cleanStr(raw.situacionActual, SITUACION_MAX),
    objetivoOnirico: pick('objetivoOnirico'),
  }
}

export function hasProfileData(profile) {
  return Boolean(
    profile &&
      (profile.rangoEdad ||
        profile.ocupacionGeneral ||
        profile.nivelEstres ||
        profile.situacionActual ||
        profile.objetivoOnirico),
  )
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return normalizeProfile(raw ? JSON.parse(raw) : null)
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile)))
    return true
  } catch {
    return false
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY)
    return true
  } catch {
    return false
  }
}

/* ---------- Meta-análisis global con IA ---------- */

export function loadMetaAnalysis() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? normalizeMetaAnalysis(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveMetaAnalysis(report) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(report))
    return true
  } catch {
    return false
  }
}

/* ---------- Copia de seguridad ---------- */

export function buildBackup(dreams) {
  return {
    app: 'dream-journal',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    count: dreams.length,
    dreams,
  }
}

/** Devuelve la lista de sueños válidos de un JSON de respaldo. Lanza Error si el formato es inválido. */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const list = Array.isArray(data) ? data : data?.dreams
  if (!Array.isArray(list)) throw new Error('El archivo no contiene una lista de sueños.')
  const dreams = list.map(normalizeDream).filter(Boolean)
  if (list.length > 0 && dreams.length === 0) throw new Error('No se encontraron sueños válidos.')
  return { dreams, skipped: list.length - dreams.length }
}

/** Fusiona por id: gana el más recientemente editado. */
export function mergeDreams(current, incoming) {
  const map = new Map(current.map((d) => [d.id, d]))
  let added = 0
  let updated = 0
  for (const d of incoming) {
    const existing = map.get(d.id)
    if (!existing) {
      map.set(d.id, d)
      added++
    } else if (d.updatedAt > existing.updatedAt) {
      map.set(d.id, d)
      updated++
    }
  }
  return { merged: [...map.values()], added, updated }
}
