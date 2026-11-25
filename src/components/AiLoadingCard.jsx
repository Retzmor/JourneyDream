import { useEffect, useState } from 'react'
import { SparklesIcon } from './icons.jsx'

export default function AiLoadingCard({
  title = 'Consultando al oráculo onírico...',
  subtitle = 'Reflexión en curso',
  phrases = [
    'Explorando símbolos y arquetipos...',
    'Cruzando emociones con niveles de lucidez...',
    'Detectando patrones y señales oníricas recurrentes...',
    'Estructurando tu meta-análisis personal...',
  ],
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [phrases])

  return (
    <div
      role="status"
      aria-live="polite"
      className="glass animate-rise relative overflow-hidden rounded-3xl border border-dream-400/30 bg-gradient-to-br from-night-900/90 via-dream-950/40 to-night-900/90 p-5 shadow-glow"
    >
      {/* Resplandores cósmicos de fondo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-dream-500/20 blur-2xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-aurora-400/15 blur-2xl animate-pulse" />

      <div className="relative z-10 flex items-center gap-3.5">
        {/* Orbe pulsante con icono */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-dream-500/30 to-aurora-400/20 shadow-glow">
          <SparklesIcon className="h-6 w-6 text-aurora-300 animate-pulse" />
          <span className="absolute inset-0 rounded-2xl border border-dream-400/40 animate-ping opacity-25" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-aurora-300 animate-pulse" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-aurora-300/90">
              {title}
            </p>
          </div>
          <div className="mt-1 h-5 overflow-hidden">
            <p
              key={index}
              className="animate-rise truncate text-sm font-medium text-slate-100"
            >
              {phrases[index]}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de progreso cósmica continua */}
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="shimmer-bar absolute inset-y-0 -left-1/3 w-1/2 rounded-full bg-gradient-to-r from-transparent via-dream-400 to-aurora-300 opacity-90" />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>{subtitle}</span>
        <span className="text-dream-300/80">~2–4 s</span>
      </div>
    </div>
  )
}

