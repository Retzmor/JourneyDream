export const PRESET_TAGS = [
  { name: 'Pesadilla', emoji: '😱' },
  { name: 'Lúcido', emoji: '👁️' },
  { name: 'Recurrente', emoji: '🔁' },
  { name: 'Vívido', emoji: '🌈' },
  { name: 'Volar', emoji: '🕊️' },
  { name: 'Miedo', emoji: '😨' },
  { name: 'Paz', emoji: '🕯️' },
  { name: 'Alegría', emoji: '✨' },
  { name: 'Extraño', emoji: '🌀' },
  { name: 'Nostalgia', emoji: '🌙' },
]

export const LUCIDITY_LEVELS = [
  { value: 1, label: 'Nada lúcido' },
  { value: 2, label: 'Un destello' },
  { value: 3, label: 'Consciente' },
  { value: 4, label: 'Muy lúcido' },
  { value: 5, label: 'Control total' },
]

/** Subconjunto de etiquetas que representan emociones (para el esquema emocional de Estadísticas). */
export const EMOTION_TAGS = ['Miedo', 'Paz', 'Alegría', 'Nostalgia', 'Extraño']

/**
 * Opciones cerradas del Perfil Onírico. Se usan listas cerradas (y no texto libre)
 * a propósito: reducen el riesgo de que el usuario escriba datos identificables.
 */
export const PROFILE_OPTIONS = {
  rangoEdad: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  ocupacionGeneral: [
    'Estudiante',
    'Tecnología / oficina',
    'Salud / cuidados',
    'Educación',
    'Arte / creatividad',
    'Comercio / servicios',
    'Oficios / trabajo físico',
    'En transición laboral',
    'Jubilado/a',
    'Otro',
  ],
  nivelEstres: [
    { value: 1, label: 'Muy bajo' },
    { value: 2, label: 'Bajo' },
    { value: 3, label: 'Medio' },
    { value: 4, label: 'Alto' },
    { value: 5, label: 'Muy alto' },
  ],
  objetivoOnirico: [
    'Recordar más mis sueños',
    'Tener sueños lúcidos',
    'Reducir pesadillas',
    'Autoconocimiento',
    'Inspiración creativa',
    'Curiosidad',
  ],
}

export const SITUACION_MAX = 280

export function tagEmoji(name) {
  return PRESET_TAGS.find((t) => t.name.toLowerCase() === name.toLowerCase())?.emoji ?? '✦'
}

/** Fecha local de hoy en formato YYYY-MM-DD (sin desfase por zona horaria). */
export function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Convierte un Date local a YYYY-MM-DD (sin desfase por zona horaria). */
export function toISODate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso) {
  return parseLocalDate(iso).toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonth(isoMonth) {
  const label = parseLocalDate(`${isoMonth}-01`).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Normaliza para búsquedas sin acentos ni mayúsculas. */
export function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
