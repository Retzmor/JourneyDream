import { useState } from 'react'
import { formatDate, tagEmoji } from '../lib/constants.js'
import { getAiProvider, getAiQuota, reportAiResponse } from '../lib/ai.js'
import {
  ChevronIcon,
  EditIcon,
  EyeIcon,
  FlagIcon,
  MoonIcon,
  SparklesIcon,
  TrashIcon,
} from './icons.jsx'
import AiLoadingCard from './AiLoadingCard.jsx'

const REPORT_REASONS = [
  'Interpretación incoherente o sin sentido',
  'Contenido sensible o inapropiado',
  'Error de idioma o formato',
  'Otro motivo',
]

export function LucidityMeter({ value }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-dream-300"
      role="img"
      aria-label={`Lucidez ${value} de 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <MoonIcon
          key={n}
          filled={n <= value}
          width={14}
          height={14}
          className={n <= value ? '' : 'opacity-30'}
        />
      ))}
    </span>
  )
}

function AiAnalysisView({ analysis }) {
  const paragraphs = analysis.interpretation
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const hasRichSymbols = analysis.symbols.some((s) => typeof s === 'object' && s !== null)
  const lucidTips = Array.isArray(analysis.lucidTip)
    ? analysis.lucidTip
    : analysis.lucidTip
      ? [analysis.lucidTip]
      : []

  return (
    <div className="selectable space-y-5 text-[15px] leading-relaxed text-slate-300">
      {/* Tono emocional */}
      {analysis.emotionalTone && (
        <div className="rounded-2xl border border-nebula-400/25 bg-nebula-400/10 p-3.5 text-sm">
          <p className="label !mb-1 text-nebula-300">Tono emocional</p>
          <p className="text-slate-200">{analysis.emotionalTone}</p>
        </div>
      )}

      {/* Interpretación profunda (2 párrafos) */}
      <div className="space-y-3">
        <p className="label !mb-1">Interpretación simbólica</p>
        {paragraphs.map((p, idx) => (
          <p key={idx} className="whitespace-pre-wrap break-words text-slate-200">
            {p}
          </p>
        ))}
      </div>

      {/* Símbolos y significados */}
      {analysis.symbols.length > 0 && (
        <div>
          <p className="label !mb-2.5">Símbolos clave</p>
          {hasRichSymbols ? (
            <div className="space-y-2.5">
              {analysis.symbols.map((s, idx) =>
                typeof s === 'object' ? (
                  <div
                    key={s.name || idx}
                    className="rounded-2xl border border-aurora-400/20 bg-aurora-400/[0.06] p-3 text-sm"
                  >
                    <p className="font-semibold text-aurora-300">{s.name}</p>
                    {s.meaning && <p className="mt-1 text-slate-300">{s.meaning}</p>}
                  </div>
                ) : (
                  <span
                    key={s}
                    className="inline-block rounded-full bg-aurora-400/10 px-3 py-1 text-xs font-medium text-aurora-300"
                  >
                    {s}
                  </span>
                ),
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.symbols.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-aurora-400/10 px-3 py-1 text-xs font-medium text-aurora-300"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consejos y señales de lucidez */}
      {lucidTips.length > 0 && (
        <div className="rounded-2xl border border-dream-400/25 bg-dream-500/10 p-3.5 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <EyeIcon className="shrink-0 text-dream-300" width={18} height={18} />
            <p className="font-semibold text-dream-300">
              {lucidTips.length > 1 ? 'Señales y consejos de lucidez' : 'Tip lúcido'}
            </p>
          </div>
          {lucidTips.length === 1 ? (
            <p className="text-slate-200">{lucidTips[0]}</p>
          ) : (
            <ul className="space-y-2 text-slate-200">
              {lucidTips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-dream-300">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pregunta reflexiva */}
      {analysis.reflectionQuestion && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-sm">
          <p className="label !mb-1 text-aurora-300">Pregunta para tu diario</p>
          <p className="italic text-slate-200">«{analysis.reflectionQuestion}»</p>
        </div>
      )}
    </div>
  )
}

function AiSection({ dream, onAnalyze, notify }) {
  const [expanded, setExpanded] = useState(false)
  const [asking, setAsking] = useState(false)
  const [forceNext, setForceNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estado para reportar respuesta IA (Google Play)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reported, setReported] = useState(false)

  const analysis = dream.aiAnalysis
  if (!onAnalyze) return null

  const provider = getAiProvider()
  const quota = getAiQuota()

  const openConfirm = (isReanalyze = false) => {
    setForceNext(isReanalyze)
    setError('')
    setAsking(true)
  }

  const run = async () => {
    setAsking(false)
    setError('')
    setLoading(true)
    try {
      await onAnalyze(dream, { forceRefresh: forceNext })
      setExpanded(true)
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
      targetType: 'single',
      targetId: dream.id,
      reason: reportReason,
      details: reportDetails,
    })
    setReporting(false)
    setReported(true)
    setReportDetails('')
    notify?.('Reporte registrado. Gracias por ayudarnos a mejorar la IA.')
  }

  const quotaExhausted = provider === 'gemini' && !quota.isPro && quota.remaining <= 0

  const confirmBox = asking && (
    <div className="mt-3 space-y-3 rounded-2xl border border-dream-400/30 bg-dream-500/10 p-3.5 text-sm text-slate-300">
      <p>
        Se enviará el texto de este sueño y tu perfil <strong className="text-white">sin datos personales</strong>{' '}
        a nuestro servidor seguro y Google Gemini para su interpretación.
      </p>

      {provider === 'gemini' && !quota.isPro && (
        <p className="text-xs text-aurora-300">
          {quota.remaining > 0
            ? `Análisis gratuitos disponibles hoy: ${quota.remaining} de ${quota.limit}.`
            : `Has usado tus ${quota.limit} análisis gratuitos de hoy. Se renuevan mañana (el diario y dictado por voz son ilimitados).`}
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
  )

  const errorBox = error && (
    <p role="alert" className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
      {error}
    </p>
  )

  return (
    <div className="px-5 pb-4">
      {loading ? (
        <AiLoadingCard
          title="Descifrando tu sueño en profundidad..."
          phrases={[
            'Explorando símbolos y arquetipos junguianos...',
            'Cruzando emociones con tu contexto personal...',
            'Diseñando señales de lucidez personalizadas...',
            'Redactando interpretación profunda...',
          ]}
        />
      ) : analysis ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border border-dream-400/25 bg-dream-500/10 px-4 text-left text-sm font-semibold text-dream-300 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2">
              <SparklesIcon width={18} height={18} /> Análisis profundo de IA
            </span>
            <ChevronIcon
              width={18}
              height={18}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="animate-rise mt-3 rounded-2xl border border-white/10 bg-black/15 p-4">
              <AiAnalysisView analysis={analysis} />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-slate-500">
                <span>
                  {new Date(analysis.createdAt).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReporting((v) => !v)}
                    className="inline-flex min-h-[36px] items-center gap-1 px-1.5 text-slate-400 transition hover:text-amber-300"
                  >
                    <FlagIcon width={13} height={13} />
                    <span>{reported ? 'Reportado' : 'Reportar respuesta IA'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirm(true)}
                    className="min-h-[36px] px-1.5 font-medium text-dream-300 hover:text-white"
                  >
                    Volver a analizar
                  </button>
                </div>
              </div>

              {reporting && (
                <form
                  onSubmit={handleReportSubmit}
                  className="animate-rise mt-3 space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs text-slate-200"
                >
                  <p className="font-semibold text-amber-200">Reportar respuesta generada por IA</p>
                  <select
                    aria-label="Motivo del reporte"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="field !py-2.5 text-xs"
                  >
                    {REPORT_REASONS.map((r) => (
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
        </>
      ) : (
        <button
          type="button"
          disabled={asking}
          onClick={() => openConfirm(false)}
          className="btn-ghost w-full !min-h-[48px] text-sm"
        >
          <SparklesIcon width={18} height={18} />
          Analizar con IA
        </button>
      )}
      {confirmBox}
      {errorBox}
    </div>
  )
}

export default function DreamCard({ dream, onEdit, onDelete, onAnalyze, notify, index = 0 }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  return (
    <article
      className="glass animate-rise overflow-hidden rounded-3xl"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setConfirming(false)
        }}
        aria-expanded={open}
        className="block w-full p-5 text-left active:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium capitalize tracking-wide text-aurora-300/80">
              {formatDate(dream.date)}
            </p>
            <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-white">
              {dream.title}
            </h3>
          </div>
          <ChevronIcon
            className={`mt-1 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </div>

        {dream.description && (
          <p
            className={`selectable mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-300 ${
              open ? '' : 'line-clamp-3'
            }`}
          >
            {dream.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LucidityMeter value={dream.lucidity} />
          {dream.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-dream-500/15 px-2.5 py-1 text-xs font-medium text-dream-300"
            >
              <span aria-hidden="true">{tagEmoji(t)}</span>
              {t}
            </span>
          ))}
        </div>
      </button>

      <AiSection dream={dream} onAnalyze={onAnalyze} notify={notify} />

      {open && (
        <div className="flex gap-2 border-t border-white/10 bg-black/10 p-3">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onDelete(dream.id)}
                className="btn-danger flex-1"
              >
                <TrashIcon width={20} height={20} />
                Sí, eliminar
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onEdit(dream)} className="btn-ghost flex-1">
                <EditIcon width={20} height={20} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="btn-danger flex-1"
              >
                <TrashIcon width={20} height={20} />
                Eliminar
              </button>
            </>
          )}
        </div>
      )}
    </article>
  )
}
