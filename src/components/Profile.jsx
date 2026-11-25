import { useState } from 'react'
import { PROFILE_OPTIONS, SITUACION_MAX } from '../lib/constants.js'
import { emptyProfile, hasProfileData } from '../lib/storage.js'
import { getAiQuota } from '../lib/ai.js'
import { LockIcon, SparklesIcon } from './icons.jsx'

function ChipGroup({ legend, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : opt)}
              className={`chip ${active ? 'chip-active' : ''}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function Profile({ profile, onSave, onClear }) {
  const [form, setForm] = useState(profile)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const quota = getAiQuota()
  const usedPct = quota.isPro ? 100 : Math.min(100, Math.round((quota.used / quota.limit) * 100))

  const handleClear = () => {
    onClear()
    setForm(emptyProfile())
    setConfirmingClear(false)
  }

  return (
    <div className="space-y-5">
      {/* ---------- Sección 1: Plan Freemium y Estado de IA ---------- */}
      <section className="glass animate-rise space-y-5 rounded-3xl p-5" aria-labelledby="ai-config-title">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dream-500/20 text-dream-300">
              <SparklesIcon />
            </div>
            <div>
              <h2 id="ai-config-title" className="text-lg font-semibold text-white">
                Inteligencia Artificial
              </h2>
              <p className="text-xs text-slate-400">Análisis simbólico y sueños lúcidos</p>
            </div>
          </div>
          <span className="rounded-full border border-aurora-400/30 bg-aurora-400/10 px-3 py-1 text-xs font-semibold text-aurora-300">
            Activa
          </span>
        </div>

        {/* Estado de cuota diaria Freemium */}
        <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              {quota.isPro ? 'Plan Pro (Ilimitado)' : 'Plan Gratuito Diario'}
            </span>
            <span className="font-semibold text-dream-300">
              {quota.isPro ? 'Sin límites' : `${quota.used} / ${quota.limit} análisis usados hoy`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-dream-500 to-aurora-400 transition-all duration-500"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Tu diario de sueños, dictado por voz, estadísticas y copias de seguridad son{' '}
            <strong className="text-slate-200">100% ilimitados</strong>. Los análisis gratuitos con IA se renuevan
            cada día.
          </p>
        </div>
      </section>

      {/* ---------- Sección 2: Perfil Onírico y Privacidad ---------- */}
      <section className="glass animate-rise space-y-6 rounded-3xl p-5" aria-labelledby="profile-title">
        <div>
          <h2 id="profile-title" className="text-lg font-semibold text-white">
            Perfil Onírico
          </h2>
          <p className="mt-1 text-sm text-slate-400">Opcional. Ayuda a que la IA contextualice sus análisis.</p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-aurora-400/25 bg-aurora-400/[0.07] p-4 text-sm leading-relaxed text-slate-300">
          <LockIcon className="mt-0.5 shrink-0 text-aurora-300" />
          <div className="space-y-2">
            <p>
              <strong className="text-white">Privacidad 100% Local:</strong> Tus sueños y tu perfil viven
              exclusivamente en este dispositivo (<code>localStorage</code>).
            </p>
            <p>
              Únicamente se envían de forma cifrada al solicitar voluntariamente un análisis con IA, sin guardar copias
              en servidores externos.
            </p>
            <p>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-aurora-300 underline decoration-aurora-400/50 underline-offset-4 hover:text-white"
              >
                Política de Privacidad ↗
              </a>
            </p>
          </div>
        </div>

        <ChipGroup
          legend="Rango de edad"
          value={form.rangoEdad}
          options={PROFILE_OPTIONS.rangoEdad}
          onChange={(v) => set({ rangoEdad: v })}
        />
        <ChipGroup
          legend="Ocupación general"
          value={form.ocupacionGeneral}
          options={PROFILE_OPTIONS.ocupacionGeneral}
          onChange={(v) => set({ ocupacionGeneral: v })}
        />

        <fieldset>
          <legend className="label">Nivel de estrés actual</legend>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Nivel de estrés">
            {PROFILE_OPTIONS.nivelEstres.map(({ value, label }) => {
              const active = form.nivelEstres === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${value} - ${label}`}
                  onClick={() => set({ nivelEstres: active ? 0 : value })}
                  className={`flex h-14 flex-col items-center justify-center rounded-2xl border text-base font-semibold transition active:scale-95 ${
                    active
                      ? 'border-dream-400/70 bg-dream-500/30 text-white shadow-glow'
                      : 'border-white/10 bg-white/[0.05] text-slate-400'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-center text-sm text-dream-300/90">
            {form.nivelEstres ? PROFILE_OPTIONS.nivelEstres[form.nivelEstres - 1].label : 'Sin indicar'}
          </p>
        </fieldset>

        <div>
          <label htmlFor="profile-situacion" className="label">
            Situación actual
          </label>
          <textarea
            id="profile-situacion"
            className="field min-h-[96px] resize-none leading-relaxed"
            placeholder="Ej: cambio de trabajo, época de exámenes… (sin nombres ni datos personales)"
            maxLength={SITUACION_MAX}
            value={form.situacionActual}
            onChange={(e) => set({ situacionActual: e.target.value })}
          />
          <p className="mt-2 text-right text-xs text-slate-500">
            {form.situacionActual.length}/{SITUACION_MAX}
          </p>
        </div>

        <ChipGroup
          legend="Objetivo onírico"
          value={form.objetivoOnirico}
          options={PROFILE_OPTIONS.objetivoOnirico}
          onChange={(v) => set({ objetivoOnirico: v })}
        />

        <div className="flex flex-col gap-3">
          <button id="save-profile" type="button" onClick={() => onSave(form)} className="btn-primary">
            Guardar perfil
          </button>
          {hasProfileData(profile) &&
            (confirmingClear ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmingClear(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="button" onClick={handleClear} className="btn-danger flex-1">
                  Sí, borrar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingClear(true)} className="btn-danger">
                Borrar mi perfil
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}
