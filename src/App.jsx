import { useCallback, useEffect, useRef, useState } from 'react'
import useDreams from './hooks/useDreams.js'
import { analyzeSingleDream } from './lib/ai.js'
import { clearProfile, emptyProfile, loadProfile, normalizeProfile, saveProfile } from './lib/storage.js'
import BottomNav from './components/BottomNav.jsx'
import DreamForm from './components/DreamForm.jsx'
import History from './components/History.jsx'
import Backup from './components/Backup.jsx'
import Stats from './components/Stats.jsx'
import LucidGuide from './components/LucidGuide.jsx'
import Profile from './components/Profile.jsx'

const TITLES = {
  history: { h1: 'Diario de Sueños', sub: 'Tu mundo nocturno' },
  form: { h1: 'Nuevo sueño', sub: 'Escríbelo antes de que se desvanezca' },
  edit: { h1: 'Editar sueño', sub: 'Ajusta los detalles' },
  stats: { h1: 'Análisis', sub: 'Tus patrones, sin salir del dispositivo' },
  guide: { h1: 'Guía lúcida', sub: 'Aprende a despertar dentro del sueño' },
  profile: { h1: 'Perfil y respaldo', sub: 'Tu contexto y tus copias de seguridad' },
}

export default function App() {
  const { dreams, saveError, addDream, updateDream, deleteDream, setAiAnalysis, importDreams } = useDreams()
  const [profile, setProfile] = useState(loadProfile)
  const [view, setView] = useState('history')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const toastTimer = useRef(null)

  const notify = useCallback((message, type = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [view, editing])

  const goTo = (next) => {
    setEditing(null)
    setView(next)
  }

  const startEdit = (dream) => {
    setEditing(dream)
    setView('form')
  }

  const handleSave = (data) => {
    if (editing) {
      updateDream(editing.id, data)
      notify('Sueño actualizado')
    } else {
      addDream(data)
      notify('Sueño guardado ✨')
    }
    goTo('history')
  }

  const handleDelete = (id) => {
    deleteDream(id)
    notify('Sueño eliminado')
  }

  /** Lanza el análisis; el resultado se guarda aunque la tarjeta se desmonte durante la espera. */
  const handleAnalyze = useCallback(
    async (dream, options) => {
      const analysis = await analyzeSingleDream(dream, profile, options)
      setAiAnalysis(dream.id, analysis)
    },
    [profile, setAiAnalysis],
  )

  const handleSaveProfile = (data) => {
    const clean = normalizeProfile(data)
    if (saveProfile(clean)) {
      setProfile(clean)
      notify('Perfil guardado en este dispositivo')
    } else {
      notify('No se pudo guardar el perfil', 'error')
    }
  }

  const handleClearProfile = () => {
    clearProfile()
    setProfile(emptyProfile())
    notify('Perfil borrado')
  }

  const knownTags = [...new Set(dreams.flatMap((d) => d.tags))]
  const head = view === 'form' && editing ? TITLES.edit : TITLES[view]

  return (
    <>
      <div className="sky" aria-hidden="true">
        <div className="stars" />
        <div className="blob -left-24 -top-20 h-72 w-72 bg-dream-600" />
        <div className="blob -right-28 top-1/3 h-72 w-72 bg-aurora-400/60" />
        <div className="blob -bottom-24 left-0 h-72 w-72 bg-nebula-400/50" />
      </div>

      <div className="mx-auto flex h-[100dvh] max-w-lg flex-col">
        <header className="px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <h1 className="bg-gradient-to-r from-white via-dream-300 to-aurora-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            {head.h1}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{head.sub}</p>
        </header>

        {saveError && (
          <p role="alert" className="mx-4 mb-2 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            No se pudo guardar en el dispositivo (almacenamiento lleno o bloqueado). Exporta una copia
            de seguridad.
          </p>
        )}

        <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-36 pt-1">
          {view === 'history' && (
            <History
              dreams={dreams}
              onEdit={startEdit}
              onDelete={handleDelete}
              onNew={() => goTo('form')}
              onAnalyze={handleAnalyze}
              notify={notify}
            />
          )}
          {view === 'form' && (
            <DreamForm
              key={editing?.id ?? 'new'}
              dream={editing}
              knownTags={knownTags}
              onSave={handleSave}
              onCancel={() => goTo('history')}
            />
          )}
          {view === 'stats' && <Stats dreams={dreams} profile={profile} notify={notify} />}
          {view === 'guide' && <LucidGuide dreams={dreams} />}
          {view === 'profile' && (
            <div className="space-y-5">
              <Profile
                profile={profile}
                onSave={handleSaveProfile}
                onClear={handleClearProfile}
                notify={notify}
              />
              <Backup dreams={dreams} onImport={importDreams} notify={notify} />
            </div>
          )}

          <footer className="mt-8 flex items-center justify-center gap-3 pb-2 text-xs text-slate-500">
            <span>Dream Journey</span>
            <span aria-hidden="true">·</span>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/20 underline-offset-4 transition hover:text-aurora-300"
            >
              Política de Privacidad
            </a>
          </footer>
        </main>
      </div>

      {toast && (
        <div
          key={toast.key}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-30 flex justify-center px-4"
        >
          <div
            className={`animate-toast glass rounded-full px-5 py-3 text-sm font-medium shadow-glow ${
              toast.type === 'error' ? 'bg-rose-500/30 text-rose-100' : 'bg-night-800/90 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <BottomNav view={view} onChange={goTo} />
    </>
  )
}
