import { ChartIcon, EyeIcon, MoonBookIcon, PlusIcon, UserIcon } from './icons.jsx'

const sideBtn =
  'flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[11px] font-medium transition active:scale-95'

const LEFT = [
  { id: 'history', label: 'Historial', Icon: MoonBookIcon },
  { id: 'stats', label: 'Análisis', Icon: ChartIcon, aria: 'Estadísticas y análisis con IA' },
]
const RIGHT = [
  { id: 'guide', label: 'Guía', Icon: EyeIcon, aria: 'Guía de sueños lúcidos' },
  { id: 'profile', label: 'Perfil', Icon: UserIcon, aria: 'Perfil y respaldo' },
]

export default function BottomNav({ view, onChange }) {
  const isForm = view === 'form'

  const renderItem = ({ id, label, Icon, aria }) => (
    <button
      key={id}
      id={`nav-${id}`}
      type="button"
      onClick={() => onChange(id)}
      aria-current={view === id ? 'page' : undefined}
      aria-label={aria}
      className={`${sideBtn} ${view === id ? 'bg-white/10 text-dream-300' : 'text-slate-400'}`}
    >
      <Icon />
      <span className="max-w-full truncate">{label}</span>
    </button>
  )

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="glass pointer-events-auto flex items-center gap-0.5 rounded-[28px] bg-night-900/80 p-2">
        {LEFT.map(renderItem)}

        <button
          id="nav-new"
          type="button"
          onClick={() => onChange('form')}
          aria-current={isForm ? 'page' : undefined}
          aria-label="Registrar nuevo sueño"
          className={`mx-1 flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[22px] bg-gradient-to-br from-dream-500 to-nebula-400/80 text-white shadow-glow transition active:scale-95 ${isForm ? 'ring-2 ring-white/40' : ''}`}
        >
          <PlusIcon width={26} height={26} />
          <span className="text-xs font-semibold">Soñé</span>
        </button>

        {RIGHT.map(renderItem)}
      </div>
    </nav>
  )
}
