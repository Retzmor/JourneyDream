import { useCallback, useEffect, useRef, useState } from 'react'
import { PRESET_TAGS, LUCIDITY_LEVELS, tagEmoji, todayISO } from '../lib/constants.js'
import { loadDraft, saveDraft, clearDraft } from '../lib/storage.js'
import useSpeechRecognition from '../hooks/useSpeechRecognition.js'
import { MicIcon, MoonIcon, PlusIcon, SquareIcon } from './icons.jsx'

function initialState(dream) {
  if (dream) {
    return {
      date: dream.date,
      title: dream.title,
      description: dream.description,
      lucidity: dream.lucidity,
      tags: dream.tags,
    }
  }
  const draft = loadDraft()
  return {
    date: draft?.date || todayISO(),
    title: draft?.title || '',
    description: draft?.description || '',
    lucidity: draft?.lucidity || 1,
    tags: Array.isArray(draft?.tags) ? draft.tags : [],
  }
}

export default function DreamForm({ dream, knownTags, onSave, onCancel }) {
  const isEditing = Boolean(dream)
  const [form, setForm] = useState(() => initialState(dream))
  const [customTag, setCustomTag] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Concatenar el dictado por voz al contenido existente en el textarea
  const handleFinalTranscript = useCallback((newChunk) => {
    if (!newChunk) return
    setError('')
    setForm((prev) => {
      const prevDesc = prev.description || ''
      const needsSpace = prevDesc.length > 0 && !/[\s\n]$/.test(prevDesc)
      return {
        ...prev,
        description: prevDesc ? `${prevDesc}${needsSpace ? ' ' : ''}${newChunk}` : newChunk,
      }
    })
  }, [])

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    toggleListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition({
    lang: 'es-CO',
    onFinalTranscript: handleFinalTranscript,
  })

  // Detener micrófono si el usuario sale o se desmonta el formulario
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  // El borrador de un sueño nuevo se guarda solo, para no perder texto al cambiar de pestaña
  useEffect(() => {
    if (!isEditing) saveDraft(form)
  }, [form, isEditing])

  // Textarea que crece con el contenido (sin límite de caracteres)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 220)}px`
  }, [form.description])

  const toggleTag = (name) =>
    set({
      tags: form.tags.some((t) => t.toLowerCase() === name.toLowerCase())
        ? form.tags.filter((t) => t.toLowerCase() !== name.toLowerCase())
        : [...form.tags, name],
    })

  const addCustomTag = () => {
    const name = customTag.trim().replace(/^#/, '')
    if (!name) return
    if (!form.tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      set({ tags: [...form.tags, name] })
    }
    setCustomTag('')
  }

  // Etiquetas visibles: predefinidas + las usadas antes + las elegidas en este formulario
  const allTags = (() => {
    const seen = new Set()
    const list = []
    for (const name of [...PRESET_TAGS.map((t) => t.name), ...knownTags, ...form.tags]) {
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        list.push(name)
      }
    }
    return list
  })()

  const handleSubmit = (e) => {
    e.preventDefault()
    stopListening()
    if (!form.title.trim() && !form.description.trim()) {
      setError('Escribe al menos un título o una descripción.')
      return
    }
    const data = {
      date: form.date || todayISO(),
      title: form.title.trim() || 'Sueño sin título',
      description: form.description,
      lucidity: form.lucidity,
      tags: form.tags,
    }
    if (!isEditing) clearDraft()
    onSave(data)
  }

  const handleCancel = () => {
    stopListening()
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit} className="animate-rise space-y-6 pb-4" noValidate>
      <div>
        <label htmlFor="dream-date" className="label">
          Fecha
        </label>
        <input
          id="dream-date"
          type="date"
          className="field"
          value={form.date}
          max="9999-12-31"
          onChange={(e) => set({ date: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="dream-title" className="label">
          Título
        </label>
        <input
          id="dream-title"
          type="text"
          className="field"
          placeholder="Ej: El océano sobre la ciudad"
          value={form.title}
          onChange={(e) => {
            setError('')
            set({ title: e.target.value })
          }}
          autoComplete="off"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="dream-description" className="label !mb-0">
            Descripción
          </label>
          {isSpeechSupported && (
            <button
              type="button"
              id="voice-dictation-btn"
              onClick={toggleListening}
              aria-label={isListening ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
              title={isListening ? 'Detener dictado (micrófono activo)' : 'Dictar por voz (es-CO)'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                isListening
                  ? 'border border-rose-500/50 bg-rose-500/20 text-rose-200 shadow-glow'
                  : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:border-dream-400/40 hover:bg-dream-500/10 hover:text-white'
              }`}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  <SquareIcon width={13} height={13} className="text-rose-300" />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <MicIcon width={14} height={14} className="text-dream-300" />
                  <span>Dictar</span>
                </>
              )}
            </button>
          )}
        </div>

        <textarea
          id="dream-description"
          ref={textareaRef}
          className="field resize-none leading-relaxed"
          placeholder="Cuéntalo todo mientras lo recuerdas: lugares, personas, sensaciones…"
          value={form.description}
          onChange={(e) => {
            setError('')
            set({ description: e.target.value })
          }}
        />

        {/* Indicador en tiempo real de dictado continuo */}
        {isListening && (
          <div
            role="status"
            aria-live="polite"
            className="animate-rise mt-2.5 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 shadow-glow"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="shrink-0 font-medium text-rose-300">Escuchando…</span>
            <span className="min-w-0 flex-1 truncate italic text-slate-200">
              {interimTranscript ? `«${interimTranscript}»` : 'Habla para narrar tu sueño…'}
            </span>
          </div>
        )}

        {/* Notificación de errores de reconocimiento o permisos */}
        {speechError && (
          <p
            role="alert"
            className="animate-rise mt-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-xs text-amber-200"
          >
            {speechError}
          </p>
        )}

        <p className="mt-2 text-right text-xs text-slate-500">
          {form.description.length.toLocaleString('es')} caracteres
        </p>
      </div>

      <fieldset>
        <legend className="label">Lucidez</legend>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Nivel de lucidez">
          {LUCIDITY_LEVELS.map(({ value, label }) => {
            const active = form.lucidity === value
            return (
              <button
                key={value}
                id={`lucidity-${value}`}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${value} - ${label}`}
                onClick={() => set({ lucidity: value })}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95 ${
                  active
                    ? 'border-dream-400/70 bg-dream-500/30 text-white shadow-glow'
                    : 'border-white/10 bg-white/[0.05] text-slate-400'
                }`}
              >
                <MoonIcon filled={active} width={20} height={20} />
                <span className="text-base font-semibold leading-none">{value}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-center text-sm text-dream-300/90">
          {LUCIDITY_LEVELS[form.lucidity - 1].label}
        </p>
      </fieldset>

      <fieldset>
        <legend className="label">Emociones y etiquetas</legend>
        <div className="flex flex-wrap gap-2">
          {allTags.map((name) => {
            const active = form.tags.some((t) => t.toLowerCase() === name.toLowerCase())
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(name)}
                className={`chip ${active ? 'chip-active' : ''}`}
              >
                <span aria-hidden="true">{tagEmoji(name)}</span>
                {name}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            id="custom-tag"
            type="text"
            className="field !py-3"
            placeholder="Crear etiqueta propia"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomTag()
              }
            }}
            maxLength={30}
          />
          <button
            id="add-custom-tag"
            type="button"
            onClick={addCustomTag}
            aria-label="Añadir etiqueta"
            className="btn-ghost !min-h-[52px] !px-4"
          >
            <PlusIcon />
          </button>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button id="save-dream" type="submit" className="btn-primary">
          {isEditing ? 'Guardar cambios' : 'Guardar sueño'}
        </button>
        {isEditing && (
          <button id="cancel-edit" type="button" onClick={handleCancel} className="btn-ghost">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
