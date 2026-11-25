import { useMemo, useState } from 'react'
import { EMOTION_TAGS, parseLocalDate, tagEmoji, todayISO, toISODate } from '../lib/constants.js'
import {
  analyzeAllDreams,
  getAiProvider,
  getAiQuota,
  META_MAX_DREAMS,
  META_MIN_DREAMS,
  reportAiResponse,
} from '../lib/ai.js'
import { loadMetaAnalysis, saveMetaAnalysis, hasProfileData } from '../lib/storage.js'
import { LucidityMeter } from './DreamCard.jsx'
import { FlagIcon, SparklesIcon } from './icons.jsx'
import AiLoadingCard from './AiLoadingCard.jsx'

const META_REPORT_REASONS = [
  'Patrones incoherentes o sin sentido',
  'Contenido sensible o inapropiado',
  'Error de idioma o formato',
  'Otro motivo',
]

const DAY_MS = 86_400_000

function computeStats(dreams) {
  const total = dreams.length
  const avgLucidity = total ? dreams.reduce((s, d) => s + d.lucidity, 0) / total : 0
  const lucidCount = dreams.filter((d) => d.lucidity >= 3).length

  // Rachas: días consecutivos con al menos un sueño registrado
  const dates = new Set(dreams.map((d) => d.date))
  const today = todayISO()
  const cursor = parseLocalDate(today)
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1) // la racha sigue viva hasta el final de hoy
  let streak = 0
  while (dates.has(toISODate(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  let longest = 0
  let run = 0
  let prev = null
  for (const iso of [...dates].sort()) {
    const diff = prev ? Math.round((parseLocalDate(iso) - parseLocalDate(prev)) / DAY_MS) : 0
    run = prev && diff === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = iso
  }

  // Frecuencia mensual de los últimos 6 meses
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = toISODate(d).slice(0, 7)
    return {
      key,
      label: d.toLocaleDateString('es', { month: 'short' }).replace('.', ''),
      count: dreams.filter((x) => x.date.startsWith(key)).length,
    }
  })

  // Etiquetas y emociones (sin distinguir mayúsculas)
  const counts = new Map()
  for (const d of dreams) {
    for (const t of d.tags) {
      const k = t.toLowerCase()
      const entry = counts.get(k) || { name: t, count: 0 }
      entry.count++
      counts.set(k, entry)
    }
  }
  const emotionKeys = new Set(EMOTION_TAGS.map((t) => t.toLowerCase()))
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name, 'es'),
  )
  const emotions = ranked.filter(([k]) => emotionKeys.has(k)).map(([, v]) => v).slice(0, 6)
  const tags = ranked.filter(([k]) => !emotionKeys.has(k)).map(([, v]) => v).slice(0, 6)

  return { total, avgLucidity, lucidCount, streak, longest, months, thisMonth: months[5].count, emotions, tags }
}

function Tile({ label, children, hint }) {
  return (
    <div className="glass rounded-3xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-2 text-3xl font-semibold leading-none text-white">{children}</div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Ranking({ title, items, total, emptyText }) {
  const max = items[0]?.count || 1
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="label !mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-3.5">
          {items.map(({ name, count }) => (
            <li key={name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-200">
                  <span aria-hidden="true">{tagEmoji(name)}</span> {name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {count} · {Math.round((count / total) * 100)}%
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label={name}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={count}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-dream-500 to-aurora-400 transition-all duration-700"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BulletList({ title, items }) {
  if (!items.length) return null
  return (
    <div>
      <p className="label !mb-2">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-400" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MetaAnalysisCard({ dreams, profile, notify }) {
  const [report, setReport] = useState(loadMetaAnalysis)
  const [asking, setAsking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState(META_REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reported, setReported] = useState(false)

  const enough = dreams.length >= META_MIN_DREAMS
  const sending = Math.min(dreams.length, META_MAX_DREAMS)
  const newSince = report ? Math.max(0, dreams.length - report.dreamsAnalyzed) : 0
  const provider = getAiProvider()
  const quota = getAiQuota()
  const quotaExhausted = provider === 'gemini' && !quota.isPro && quota.remaining <= 0

  const run = async () => {
    setAsking(false)
    setError('')
    setLoading(true)
    try {
      const result = await analyzeAllDreams(dreams, profile, { forceRefresh: Boolean(report) })
      saveMetaAnalysis(result) // se guarda aunque el usuario cambie de pestaña mientras tanto
      setReport(result)
      setReported(false)
    } catch (err) {
      setError(
        err?.message ||
          'La conexión con el oráculo tardó más de lo esperado. Revisa tu internet e inténtalo de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReportSubmit = (e) => {
    e.preventDefault()
    reportAiResponse({
      targetType: 'meta',
      targetId: String(report?.createdAt || ''),
      reason: reportReason,
      details: reportDetails,
    })
    setReporting(false)
    setReported(true)
    setReportDetails('')
    notify?.('Reporte registrado. Gracias por ayudarnos a mejorar la IA.')
  }

  return (
    <section className="glass rounded-3xl border-dream-400/20 p-5 shadow-glow">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dream-500/20 text-dream-300">
          <SparklesIcon />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Meta-análisis global</h2>
          <p className="text-xs text-slate-400">Patrones y evolución de tus últimos sueños</p>
        </div>
      </div>

      {report && (
        <div className="selectable animate-rise mt-5 space-y-5 text-[15px] leading-relaxed text-slate-300">
          <BulletList title="Patrones recurrentes" items={report.patterns} />
          {report.dreamSigns.length > 0 && (
            <div>
              <p className="label !mb-2">Señales oníricas</p>
              <div className="flex flex-wrap gap-2">
                {report.dreamSigns.map((s) => (
                  <span key={s} className="rounded-full bg-aurora-400/10 px-3 py-1 text-xs font-medium text-aurora-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {report.emotionalEvolution && (
            <div>
              <p className="label !mb-2">Evolución emocional</p>
              <p className="whitespace-pre-wrap break-words">{report.emotionalEvolution}</p>
            </div>
          )}
          <BulletList title="Recomendaciones" items={report.recommendations} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-slate-500">
            <span>
              Basado en {report.dreamsAnalyzed} sueños ·{' '}
              {new Date(report.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              {newSince > 0 && ` · ${newSince} sueño${newSince === 1 ? '' : 's'} nuevo${newSince === 1 ? '' : 's'} desde entonces`}
            </span>
            <button
              type="button"
              onClick={() => setReporting((v) => !v)}
              className="inline-flex min-h-[34px] items-center gap-1 px-1.5 text-slate-400 transition hover:text-amber-300"
            >
              <FlagIcon width={13} height={13} />
              <span>{reported ? 'Reportado' : 'Reportar respuesta IA'}</span>
            </button>
          </div>

          {reporting && (
            <form
              onSubmit={handleReportSubmit}
              className="animate-rise space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs text-slate-200"
            >
              <p className="font-semibold text-amber-200">Reportar reporte generado por IA</p>
              <select
                aria-label="Motivo del reporte"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="field !py-2.5 text-xs"
              >
                {META_REPORT_REASONS.map((r) => (
                  <option key={r} value={r} className="bg-night-900 text-slate-100">
                    {r}
                  </option>
                ))}
              </select>
              <textarea
                rows={2}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Detalle opcional sobre el problema observado…"
                className="field !py-2.5 text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="btn-ghost flex-1 !min-h-[38px] !px-3 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1 !min-h-[38px] !px-3 text-xs">
                  Enviar reporte
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!report && !loading && (
        <p className="mt-4 text-sm text-slate-400">
          {enough
            ? 'Descubre temas que se repiten, tus señales oníricas y cómo cambia tu estado emocional.'
            : `Registra al menos ${META_MIN_DREAMS} sueños para generar tu primer meta-análisis.`}
        </p>
      )}

      {asking && (
        <div className="mt-4 space-y-3 rounded-2xl border border-dream-400/30 bg-dream-500/10 p-3.5 text-sm text-slate-300">
          <p>
            Se enviarán los textos de tus últimos <strong className="text-white">{sending} sueños</strong>
            {hasProfileData(profile) ? ' y tu perfil ' : ' '}
            <strong className="text-white">sin datos personales</strong> a nuestro servidor seguro y Google Gemini.
          </p>
          {provider === 'gemini' && !quota.isPro && (
            <p className="text-xs text-aurora-300">
              {quota.remaining > 0
                ? `Análisis gratuitos disponibles hoy: ${quota.remaining} de ${quota.limit}.`
                : `Has usado tus ${quota.limit} análisis gratuitos de hoy. Se renuevan mañana.`}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAsking(false)} className="btn-ghost flex-1 !min-h-[44px] !px-4 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              disabled={quotaExhausted}
              onClick={run}
              className="btn-primary flex-1 !min-h-[44px] !px-4 text-sm"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-5">
          <AiLoadingCard
            title="Generando meta-análisis global..."
            phrases={[
              'Explorando símbolos y arquetipos...',
              'Cruzando emociones con niveles de lucidez...',
              'Detectando patrones y señales oníricas recurrentes...',
              'Estructurando tu meta-análisis personal...',
            ]}
          />
        </div>
      ) : (
        !asking && (
          <button
            id="run-meta-analysis"
            type="button"
            disabled={!enough}
            onClick={() => setAsking(true)}
            className="btn-primary mt-5 w-full"
          >
            <SparklesIcon />
            {report ? 'Actualizar meta-análisis' : 'Generar meta-análisis con IA'}
          </button>
        )
      )}
    </section>
  )
}

export default function Stats({ dreams, profile, notify }) {
  const stats = useMemo(() => computeStats(dreams), [dreams])
  const maxMonth = Math.max(1, ...stats.months.map((m) => m.count))

  if (dreams.length === 0) {
    return (
      <div className="flex animate-rise flex-col items-center px-4 pt-16 text-center">
        <div className="animate-float text-7xl" aria-hidden="true">
          🔭
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-white">Aún no hay datos</h2>
        <p className="mt-2 max-w-xs text-slate-400">
          Registra tus primeros sueños y aquí verás tus estadísticas, tu esquema emocional y el análisis con IA.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-rise space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Sueños" hint={`${stats.lucidCount} con lucidez ≥ 3`}>
          {stats.total}
        </Tile>
        <Tile label="Lucidez media" hint="Escala de 1 a 5">
          <span className="flex flex-col gap-2">
            {stats.avgLucidity.toFixed(1)}
            <LucidityMeter value={Math.round(stats.avgLucidity)} />
          </span>
        </Tile>
        <Tile label="Racha" hint={`Mejor: ${stats.longest} ${stats.longest === 1 ? 'día' : 'días'}`}>
          {stats.streak} <span className="text-base font-medium text-slate-400">{stats.streak === 1 ? 'día' : 'días'}</span>
        </Tile>
        <Tile label="Este mes" hint="Sueños registrados">
          {stats.thisMonth}
        </Tile>
      </div>

      <MetaAnalysisCard dreams={dreams} profile={profile} />

      <section className="glass rounded-3xl p-5">
        <h2 className="label !mb-4">Frecuencia mensual</h2>
        <div className="flex h-32 items-end gap-2">
          {stats.months.map((m) => (
            <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs text-slate-400">{m.count || ''}</span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-dream-600 to-aurora-400/80 transition-all duration-700"
                style={{ height: `${m.count ? Math.max(6, (m.count / maxMonth) * 100) : 3}%`, opacity: m.count ? 1 : 0.25 }}
                role="img"
                aria-label={`${m.label}: ${m.count} sueños`}
              />
              <span className="text-xs capitalize text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <Ranking
        title="Esquema emocional"
        items={stats.emotions}
        total={stats.total}
        emptyText="Marca emociones (Miedo, Paz, Alegría…) en tus sueños para ver tu esquema emocional."
      />
      <Ranking
        title="Etiquetas más frecuentes"
        items={stats.tags}
        total={stats.total}
        emptyText="Aún no has usado etiquetas."
      />
    </div>
  )
}

