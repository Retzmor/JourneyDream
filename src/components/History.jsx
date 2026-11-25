import { useMemo, useState } from 'react'
import DreamCard from './DreamCard.jsx'
import { formatMonth, normalize, tagEmoji } from '../lib/constants.js'
import { CloseIcon, PlusIcon, SearchIcon } from './icons.jsx'

export default function History({ dreams, onEdit, onDelete, onNew, onAnalyze, notify }) {
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState([])

  // Etiquetas en uso, de la más a la menos frecuente
  const tagsInUse = useMemo(() => {
    const counts = new Map()
    for (const d of dreams) for (const t of d.tags) counts.set(t, (counts.get(t) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  }, [dreams])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return dreams
      .filter((d) => {
        if (activeTags.length && !activeTags.every((t) => d.tags.includes(t))) return false
        if (!q) return true
        const haystack = normalize(`${d.title} ${d.description} ${d.tags.join(' ')}`)
        return q.split(/\s+/).every((word) => haystack.includes(word))
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [dreams, query, activeTags])

  const groups = useMemo(() => {
    const map = new Map()
    for (const d of filtered) {
      const key = d.date.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(d)
    }
    return [...map.entries()]
  }, [filtered])

  const toggleTag = (t) =>
    setActiveTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const hasFilters = query.trim() || activeTags.length > 0

  if (dreams.length === 0) {
    return (
      <div className="flex animate-rise flex-col items-center px-4 pt-16 text-center">
        <div className="animate-float text-7xl" aria-hidden="true">
          🌙
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-white">Tu diario está vacío</h2>
        <p className="mt-2 max-w-xs text-slate-400">
          Los sueños se desvanecen rápido. Registra el primero apenas despiertes.
        </p>
        <button id="empty-new-dream" type="button" onClick={onNew} className="btn-primary mt-8 w-full max-w-xs">
          <PlusIcon /> Registrar mi primer sueño
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="search-dreams"
          type="search"
          className="field !pl-12 !pr-12"
          placeholder="Buscar por palabras clave…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 active:bg-white/10"
          >
            <CloseIcon width={20} height={20} />
          </button>
        )}
      </div>

      {tagsInUse.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por etiqueta">
          {tagsInUse.map(([name, count]) => {
            const active = activeTags.includes(name)
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
                <span className="text-xs opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between px-1 text-sm text-slate-400">
        <span>
          {filtered.length} {filtered.length === 1 ? 'sueño' : 'sueños'}
          {hasFilters && ` de ${dreams.length}`}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setActiveTags([])
            }}
            className="min-h-[44px] px-2 font-medium text-dream-300"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="animate-rise py-12 text-center">
          <div className="text-5xl" aria-hidden="true">
            🔭
          </div>
          <p className="mt-4 text-lg font-medium text-white">Sin resultados</p>
          <p className="mt-1 text-slate-400">Prueba con otras palabras o quita algún filtro.</p>
        </div>
      ) : (
        groups.map(([month, items]) => (
          <section key={month} aria-label={formatMonth(month)} className="space-y-3">
            <h2 className="sticky top-0 z-10 -mx-4 bg-gradient-to-b from-night-950/95 to-transparent px-5 pb-2 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 backdrop-blur-sm">
              {formatMonth(month)}
            </h2>
            {items.map((d, i) => (
              <DreamCard
                key={d.id}
                dream={d}
                index={i}
                onEdit={onEdit}
                onDelete={onDelete}
                onAnalyze={onAnalyze}
                notify={notify}
              />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
