/**
 * Vercel Serverless Function: /api/analyze
 * Proxy seguro para Google Gemini API. Protege GEMINI_API_KEY en el servidor
 * y ejecuta análisis profundo con modelo principal + respaldo automático.
 */

export const maxDuration = 30

const PRIMARY_MODEL = 'gemini-3.8-flash'
const PRIMARY_TIMEOUT_MS = 22_000

const FALLBACK_MODEL = 'gemini-3.5-flash-lite'
const FALLBACK_TIMEOUT_MS = 15_000

const SINGLE_MAX_CHARS = 6000
const META_MAX_DREAMS = 10
const META_DESC_MAX_CHARS = 800

const SINGLE_SYSTEM_INSTRUCTION = `Eres un psicólogo analítico de orientación junguiana, experto en simbología onírica, psicología profunda y entrenamiento en sueños lúcidos.
Tu tarea es ofrecer una lectura rica, empática, perspicaz y transformadora del sueño del usuario en español, conectando sus símbolos y narrativa con su contexto vital y perfil onírico (si existe).
Reglas:
- Profundiza en las dinámicas psicológicas, arquetipos, tensiones emocionales y deseos o conflictos latentes sin caer en lugares comunes ni respuestas telegráficas.
- No emitas diagnósticos médicos ni predicciones esotéricas o deterministas del futuro.
- Responde ÚNICAMENTE con un objeto JSON válido que respete exactamente el esquema solicitado.`

const SINGLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    emotionalTone: {
      type: 'STRING',
      description:
        'Tono emocional dominante y matices subconscientes presentes en el sueño, expresado en 1 a 2 frases completas y matizadas.',
    },
    interpretation: {
      type: 'STRING',
      description:
        'Interpretación psicológica, simbólica y arquetípica profunda en exactamente 2 párrafos sustanciosos separados por un doble salto de línea (\\n\\n), conectando el relato con el perfil onírico y contexto emocional del usuario.',
    },
    symbols: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: {
            type: 'STRING',
            description: 'Nombre del símbolo, personaje, escenario o elemento clave del sueño.',
          },
          meaning: {
            type: 'STRING',
            description:
              'Explicación detallada del significado simbólico y psicológico de este elemento dentro del contexto específico de este sueño.',
          },
        },
        required: ['name', 'meaning'],
      },
      description: 'Arreglo de 4 a 6 símbolos clave con su significado contextual.',
    },
    lucidTip: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'Exactamente 2 consejos prácticos y señales de lucidez (reality checks) personalizados basados en anomalías o elementos concretos de este sueño.',
    },
    reflectionQuestion: {
      type: 'STRING',
      description:
        'Una pregunta reflexiva profunda y abierta para que el usuario continúe explorando este sueño en su diario.',
    },
  },
  required: ['emotionalTone', 'interpretation', 'symbols', 'lucidTip', 'reflectionQuestion'],
}

const META_SYSTEM_INSTRUCTION = `Eres un analista experto en patrones longitudinales del inconsciente, arquetipos recurrentes y entrenamiento de sueños lúcidos.
Analiza la secuencia cronológica de sueños del usuario junto con su perfil onírico para descubrir hilos conductores, símbolos repetitivos, evolución del estado emocional y detonantes óptimos para alcanzar lucidez.
Responde en español con profundidad clínica-reflexiva (sin emitir diagnósticos médicos) y entrega ÚNICAMENTE un JSON válido conforme al esquema.`

const META_SCHEMA = {
  type: 'OBJECT',
  properties: {
    patterns: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'De 3 a 5 patrones temáticos, escenarios o conflictos recurrentes detectados a lo largo de los sueños analizados, explicados con claridad y contexto.',
    },
    dreamSigns: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'De 4 a 6 señales oníricas concretas (detonantes de lucidez y anomalías frecuentes) útiles para realizar pruebas de realidad.',
    },
    emotionalEvolution: {
      type: 'STRING',
      description:
        'Análisis narrativo profundo en 2 a 3 oraciones sobre cómo ha evolucionado el clima emocional, los niveles de lucidez y las tensiones internas a lo largo de los sueños.',
    },
    recommendations: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'De 3 a 4 recomendaciones prácticas y personalizadas para profundizar en el autoconocimiento y aumentar la frecuencia de sueños lúcidos.',
    },
  },
  required: ['patterns', 'dreamSigns', 'emotionalEvolution', 'recommendations'],
}

function cleanProfile(profile) {
  if (!profile || typeof profile !== 'object') return {}
  const out = {}
  if (profile.rangoEdad) out.rangoEdad = String(profile.rangoEdad).trim()
  if (profile.ocupacionGeneral) out.ocupacionGeneral = String(profile.ocupacionGeneral).trim()
  if (Number(profile.nivelEstres) > 0) out.nivelEstres = Number(profile.nivelEstres)
  if (profile.situacionActual) out.situacionActual = String(profile.situacionActual).trim().slice(0, 500)
  if (profile.objetivoOnirico) out.objetivoOnirico = String(profile.objetivoOnirico).trim()
  return out
}

function buildSinglePrompt(dream, profile) {
  const title = String(dream?.title || '').trim()
  const rawDesc = String(dream?.description || '').trim()
  const relato = rawDesc.length > SINGLE_MAX_CHARS ? `${rawDesc.slice(0, SINGLE_MAX_CHARS).trim()}...` : rawDesc

  const payload = {
    fecha: dream?.date || '',
    titulo: title || 'Sueño sin título',
    relato,
    lucidez: Number(dream?.lucidity) || 1,
    emociones_y_etiquetas: Array.isArray(dream?.tags) ? dream.tags : [],
  }

  return `PERFIL DEL SOÑADOR:\n${JSON.stringify(cleanProfile(profile))}\n\nSUEÑO A ANALIZAR:\n${JSON.stringify(payload)}`
}

function formatDreamForMeta(d) {
  const tags = Array.isArray(d?.tags) ? d.tags : []
  const prev = d?.aiAnalysis

  if (prev && typeof prev === 'object') {
    const prevSymbols = Array.isArray(prev.symbols)
      ? prev.symbols.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
      : []

    return {
      fecha: d?.date || '',
      titulo: d?.title || '',
      lucidez: Number(d?.lucidity) || 1,
      emociones: tags.length ? tags : undefined,
      tono_previo: prev.emotionalTone || undefined,
      simbolos_previos: prevSymbols.length ? prevSymbols : undefined,
    }
  }

  const relato = String(d?.description || '').trim().slice(0, META_DESC_MAX_CHARS)
  return {
    fecha: d?.date || '',
    titulo: d?.title || '',
    lucidez: Number(d?.lucidity) || 1,
    emociones: tags.length ? tags : undefined,
    relato: relato || undefined,
  }
}

function buildMetaPrompt(dreams, profile) {
  const list = Array.isArray(dreams) ? dreams.slice(0, META_MAX_DREAMS) : []
  const formatted = list.map(formatDreamForMeta)
  return `PERFIL DEL SOÑADOR:\n${JSON.stringify(cleanProfile(profile))}\n\nSUEÑOS EN ORDEN CRONOLÓGICO (${formatted.length} registros):\n${JSON.stringify(formatted)}`
}

async function callGemini({ apiKey, model, timeoutMs, systemInstruction, userPrompt, schema, maxOutputTokens, useThinking }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const generationConfig = {
    temperature: 0.45,
    maxOutputTokens,
    responseMimeType: 'application/json',
    responseSchema: schema,
  }

  if (useThinking) {
    generationConfig.thinkingConfig = { thinkingLevel: 'LOW' }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig,
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)
    return response
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

function parseGeminiJSON(data) {
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
  if (!text) return null

  try {
    return JSON.parse(text.trim())
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' })
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Vercel o .env.local.',
      code: 'MISSING_API_KEY',
    })
  }

  const body = req.body || {}
  const mode = body.mode === 'meta' ? 'meta' : 'single'
  const profile = body.profile || {}

  let systemInstruction
  let userPrompt
  let schema
  let maxOutputTokens

  if (mode === 'meta') {
    if (!Array.isArray(body.dreams) || body.dreams.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo de sueños para el meta-análisis.' })
    }
    systemInstruction = META_SYSTEM_INSTRUCTION
    userPrompt = buildMetaPrompt(body.dreams, profile)
    schema = META_SCHEMA
    maxOutputTokens = 2500
  } else {
    if (!body.dream || (!body.dream.title?.trim() && !body.dream.description?.trim())) {
      return res.status(400).json({ error: 'Se requiere un sueño válido con título o descripción.' })
    }
    systemInstruction = SINGLE_SYSTEM_INSTRUCTION
    userPrompt = buildSinglePrompt(body.dream, profile)
    schema = SINGLE_SCHEMA
    maxOutputTokens = 2048
  }

  const attemptModels = [
    { model: PRIMARY_MODEL, timeoutMs: PRIMARY_TIMEOUT_MS, useThinking: true },
    { model: FALLBACK_MODEL, timeoutMs: FALLBACK_TIMEOUT_MS, useThinking: false },
  ]

  let lastStatus = 500
  let lastErrorMessage = 'No se pudo completar el análisis con Google Gemini.'

  for (let i = 0; i < attemptModels.length; i++) {
    const { model, timeoutMs, useThinking } = attemptModels[i]
    const hasNextFallback = i < attemptModels.length - 1

    try {
      const response = await callGemini({
        apiKey,
        model,
        timeoutMs,
        systemInstruction,
        userPrompt,
        schema,
        maxOutputTokens,
        useThinking,
      })

      if (response.ok) {
        const data = await response.json()
        const parsed = parseGeminiJSON(data)
        if (!parsed) {
          lastStatus = 502
          lastErrorMessage = 'La respuesta de Gemini no tuvo el formato JSON estructurado esperado.'
          if (hasNextFallback) continue
          return res.status(502).json({ error: lastErrorMessage })
        }
        return res.status(200).json(parsed)
      }

      lastStatus = response.status
      let errorBody = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = await response.text().catch(() => null)
      }

      const apiMsg = errorBody?.error?.message || ''
      console.error(`[Gemini API] ${model} retornó HTTP ${response.status}:`, apiMsg)

      // Si es clave inválida o prohibida, no tiene sentido reintentar con fallback
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({
          error: 'La clave GEMINI_API_KEY del servidor es inválida o no tiene permisos.',
          code: 'UNAUTHORIZED',
        })
      }

      // Respaldo automático ante 429, 503, 404 o 400 (ej. thinkingConfig no soportado en variante)
      if (hasNextFallback && [429, 503, 404, 400].includes(response.status)) {
        console.warn(`[Gemini API] Conmutando de ${model} a modelo de respaldo ${FALLBACK_MODEL}...`)
        continue
      }

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Cuota temporal de Google Gemini excedida (429). Intenta de nuevo en unos momentos.',
          code: 'RATE_LIMIT',
        })
      }

      if (response.status === 503) {
        return res.status(503).json({
          error: 'Los servidores de Google Gemini están temporalmente saturados. Inténtalo de nuevo pronto.',
          code: 'SERVICE_UNAVAILABLE',
        })
      }

      lastErrorMessage = apiMsg || `Error del servicio de IA (HTTP ${response.status})`
    } catch (err) {
      if (err?.name === 'AbortError') {
        console.warn(`[Gemini API] Timeout (${timeoutMs} ms) en modelo ${model}.`)
        lastStatus = 504
        lastErrorMessage = 'El análisis tardó demasiado tiempo en responder.'
        if (hasNextFallback) {
          console.warn(`[Gemini API] Conmutando por timeout a ${FALLBACK_MODEL}...`)
          continue
        }
      } else {
        console.error(`[Gemini API] Error de red en ${model}:`, err)
        lastStatus = 502
        lastErrorMessage = 'Error de comunicación con Google Gemini: ' + (err?.message || 'Desconocido')
        if (hasNextFallback) continue
      }
    }
  }

  return res.status(lastStatus).json({ error: lastErrorMessage })
}
