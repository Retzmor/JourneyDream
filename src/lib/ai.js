/**
 * Cliente de IA del Diario de Sueños (Dream Journey).
 *
 * Arquitectura segura cliente-servidor:
 * - Todas las llamadas a Google Gemini pasan por el endpoint seguro `/api/analyze`
 *   (sin exponer ninguna API Key en el navegador).
 * - Límite freemium local: 3 análisis gratuitos de IA por día (caché inteligente de 0 ms
 *   no consume cuota). El registro de sueños y dictado por voz son 100% ilimitados.
 * - Soporte de reporte de respuestas IA para cumplimiento de Google Play.
 */
import { todayISO } from './constants.js'
import { normalizeAnalysis, normalizeMetaAnalysis, normalizeProfile } from './storage.js'

export const AI_QUOTA_STORAGE = 'dreamjournal:ai_quota:v1'
export const AI_REPORTS_STORAGE = 'dreamjournal:ai_reports:v1'

export const DAILY_FREE_AI_LIMIT = 3
export const META_MIN_DREAMS = 3
export const META_MAX_DREAMS = 10

const CLIENT_TIMEOUT_MS = 32_000 // Margen superior al maxDuration (30s) de Vercel
const SINGLE_MAX_CHARS = 6000

/* ---------- Resolución del Endpoint Seguro ---------- */

function getAnalyzeEndpoint() {
  const customBase = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  return customBase ? `${customBase}/api/analyze` : '/api/analyze'
}

export function getAiProvider() {
  return 'gemini'
}

export function isAIConfigured() {
  return true
}

/* ---------- Cuota Freemium Local (3 análisis gratis/día) ---------- */

export function getAiQuota() {
  const today = todayISO()
  const fallback = { used: 0, limit: DAILY_FREE_AI_LIMIT, remaining: DAILY_FREE_AI_LIMIT, date: today, isPro: false }

  if (typeof window === 'undefined' || !window.localStorage) return fallback

  try {
    const raw = localStorage.getItem(AI_QUOTA_STORAGE)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    const isPro = Boolean(parsed?.isPro)
    if (parsed?.date !== today) {
      return { used: 0, limit: DAILY_FREE_AI_LIMIT, remaining: DAILY_FREE_AI_LIMIT, date: today, isPro }
    }
    const used = Math.max(0, Number(parsed?.used) || 0)
    const remaining = isPro ? Infinity : Math.max(0, DAILY_FREE_AI_LIMIT - used)
    return { used, limit: DAILY_FREE_AI_LIMIT, remaining, date: today, isPro }
  } catch {
    return fallback
  }
}

export function consumeAiQuota() {
  const current = getAiQuota()
  if (current.isPro) return current
  const next = {
    date: current.date,
    used: current.used + 1,
    isPro: current.isPro,
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(AI_QUOTA_STORAGE, JSON.stringify(next))
    } catch {}
  }
  return {
    ...next,
    limit: DAILY_FREE_AI_LIMIT,
    remaining: Math.max(0, DAILY_FREE_AI_LIMIT - next.used),
  }
}

/* ---------- Registro de Reportes de Respuestas IA (Google Play) ---------- */

export function reportAiResponse({ targetType = 'single', targetId = '', reason = '', details = '' }) {
  const entry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    targetType,
    targetId,
    reason: String(reason || 'Respuesta inapropiada o inexacta').trim().slice(0, 120),
    details: String(details || '').trim().slice(0, 500),
    createdAt: Date.now(),
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(AI_REPORTS_STORAGE)
      const list = raw ? JSON.parse(raw) : []
      const updated = Array.isArray(list) ? [...list.slice(-49), entry] : [entry]
      localStorage.setItem(AI_REPORTS_STORAGE, JSON.stringify(updated))
    } catch {}
  }

  return { ok: true, entry }
}

/* ---------- Caché Inteligente (0 ms de respuesta sin consumir cuota) ---------- */

function computeHash(str) {
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function getSingleDreamCacheKey(dream, profile) {
  const p = normalizeProfile(profile)
  const content = `v2|${dream.title}|${(dream.description || '').slice(0, SINGLE_MAX_CHARS)}|${dream.lucidity}|${(dream.tags || []).join(',')}|${p.situacionActual}|${p.objetivoOnirico}|${p.nivelEstres}|${p.rangoEdad}|${p.ocupacionGeneral}`
  return `dreamjournal:cache:dream:${dream.id || 'new'}:${computeHash(content)}`
}

function getMetaAnalysisCacheKey(recentDreams, profile) {
  const p = normalizeProfile(profile)
  const content =
    `v2|` +
    recentDreams.map((d) => `${d.id}:${d.updatedAt || d.createdAt || ''}`).join('|') +
    `|${p.situacionActual}|${p.objetivoOnirico}|${p.nivelEstres}`
  return `dreamjournal:cache:meta:${computeHash(content)}`
}

/* ---------- Llamada al Backend Seguro (/api/analyze) ---------- */

async function callBackendAnalyze(payload) {
  const endpoint = getAnalyzeEndpoint()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      let errData = null
      try {
        errData = await response.json()
      } catch {
        errData = null
      }
      throw new Error(errData?.error || `El servidor de análisis respondió con error (${response.status}).`)
    }

    return await response.json()
  } catch (err) {
    clearTimeout(timer)
    if (err?.name === 'AbortError') {
      throw new Error(
        'El análisis profundo tardó más de lo esperado. Verifica tu conexión e inténtalo de nuevo.',
      )
    }
    if (err instanceof TypeError || /failed to fetch|network/i.test(err?.message || '')) {
      throw new Error('No se pudo conectar con el servidor de IA. Verifica tu conexión a internet.')
    }
    throw err
  }
}

/* ---------- API Pública ---------- */

export async function analyzeSingleDream(dream, userProfile, options = {}) {
  const { forceRefresh = false } = options
  const cacheKey = getSingleDreamCacheKey(dream, userProfile)

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        const valid = normalizeAnalysis(parsed)
        if (valid) {
          console.info('[AI Cache] Análisis individual recuperado de caché local (0 ms)')
          return valid
        }
      }
    } catch {}
  }

  const quota = getAiQuota()
  if (!quota.isPro && quota.remaining <= 0) {
    const err = new Error(
      `Has alcanzado tu límite de ${DAILY_FREE_AI_LIMIT} análisis gratuitos con IA por hoy. Se renovarán mañana (el registro de sueños y dictado por voz siguen siendo 100% ilimitados).`,
    )
    err.code = 'QUOTA_EXCEEDED'
    throw err
  }

  const cleanUserProfile = normalizeProfile(userProfile)
  const raw = await callBackendAnalyze({
    mode: 'single',
    dream: {
      id: dream.id,
      date: dream.date,
      title: dream.title,
      description: (dream.description || '').slice(0, SINGLE_MAX_CHARS),
      lucidity: dream.lucidity,
      tags: dream.tags,
    },
    profile: cleanUserProfile,
  })

  const analysis = normalizeAnalysis({ ...raw, createdAt: Date.now() })
  if (!analysis) throw new Error('La respuesta de la IA no contiene los campos requeridos.')

  consumeAiQuota()

  try {
    localStorage.setItem(cacheKey, JSON.stringify(analysis))
  } catch {}

  return analysis
}

export async function analyzeAllDreams(dreamsList, userProfile, options = {}) {
  if (dreamsList.length < META_MIN_DREAMS) {
    throw new Error(`Registra al menos ${META_MIN_DREAMS} sueños para obtener un meta-análisis.`)
  }

  const { forceRefresh = false } = options

  // Tomar hasta los últimos 10 sueños en orden cronológico
  const recent = [...dreamsList]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, META_MAX_DREAMS)
    .reverse()

  const cacheKey = getMetaAnalysisCacheKey(recent, userProfile)
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        const valid = normalizeMetaAnalysis(parsed)
        if (valid) {
          console.info('[AI Cache] Meta-análisis recuperado de caché local (0 ms)')
          return valid
        }
      }
    } catch {}
  }

  const quota = getAiQuota()
  if (!quota.isPro && quota.remaining <= 0) {
    const err = new Error(
      `Has alcanzado tu límite de ${DAILY_FREE_AI_LIMIT} análisis gratuitos con IA por hoy. Se renovarán mañana.`,
    )
    err.code = 'QUOTA_EXCEEDED'
    throw err
  }

  const cleanUserProfile = normalizeProfile(userProfile)
  const raw = await callBackendAnalyze({
    mode: 'meta',
    dreams: recent.map((d) => ({
      date: d.date,
      title: d.title,
      description: (d.description || '').slice(0, 800),
      lucidity: d.lucidity,
      tags: d.tags,
      aiAnalysis: d.aiAnalysis,
    })),
    profile: cleanUserProfile,
  })

  const report = normalizeMetaAnalysis({
    ...raw,
    dreamsAnalyzed: recent.length,
    createdAt: Date.now(),
  })
  if (!report) throw new Error('El reporte generado no contiene los campos requeridos.')

  consumeAiQuota()

  try {
    localStorage.setItem(cacheKey, JSON.stringify(report))
  } catch {}

  return report
}
