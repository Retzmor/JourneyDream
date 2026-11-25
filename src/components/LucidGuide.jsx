import { useMemo, useState } from 'react'
import { tagEmoji } from '../lib/constants.js'
import { CheckIcon, ChevronIcon, EyeIcon } from './icons.jsx'

const TECHNIQUES = [
  {
    id: 'mild',
    name: 'MILD',
    full: 'Inducción mnemónica de sueños lúcidos',
    level: 'Principiante',
    summary: 'Usa la intención y la memoria prospectiva: te programas para recordar que sueñas.',
    steps: [
      'Anota tus sueños cada mañana: un buen recuerdo onírico es la base de todo.',
      'Al irte a dormir (o tras despertar de madrugada), recuerda un sueño reciente.',
      'Repite mentalmente: «La próxima vez que sueñe, recordaré que estoy soñando».',
      'Visualízate de vuelta en ese sueño, notando una señal onírica y pensando «¡estoy soñando!».',
      'Repite los pasos 3 y 4 hasta quedarte dormido.',
    ],
  },
  {
    id: 'wbtb',
    name: 'WBTB',
    full: 'Despertar y volver a la cama',
    level: 'Principiante',
    summary: 'Interrumpes el sueño en la fase con más REM y vuelves con la mente más alerta.',
    steps: [
      'Pon una alarma suave a las 5–6 horas de haberte dormido.',
      'Levántate 15–30 minutos: lee sobre sueños lúcidos o repasa tu diario.',
      'Vuelve a la cama aplicando MILD con la intención clara de reconocer que sueñas.',
      'Úsala solo 1–2 veces por semana: si afecta tu descanso, pausa la práctica.',
    ],
  },
  {
    id: 'wild',
    name: 'WILD',
    full: 'Inducción de sueño lúcido desde la vigilia',
    level: 'Avanzado',
    summary: 'Pasas de la vigilia al sueño sin perder la consciencia. Requiere práctica.',
    steps: [
      'Después de un WBTB, acuéstate boca arriba, relajado y sin moverte.',
      'Observa con calma las imágenes y sonidos que aparecen al adormecerte (imaginería hipnagógica).',
      'Mantén la mente alerta y pasiva; si pica o molesta, ignóralo en lugar de moverte.',
      'Puedes sentir vibraciones o parálisis del sueño: es normal e inofensiva. Respira con calma.',
      'Cuando la escena se estabilice, entra en ella con la imaginación y explora.',
    ],
  },
]

const REALITY_CHECKS = [
  {
    title: 'Mira tus manos',
    how: 'Cuéntate los dedos y observa la forma de tus manos.',
    dream: 'En un sueño pueden verse deformes, con dedos de más o que cambian.',
  },
  {
    title: 'Lee dos veces',
    how: 'Lee un texto, aparta la vista y vuelve a leerlo.',
    dream: 'En sueños el texto suele cambiar o ser ilegible.',
  },
  {
    title: 'Tapa la nariz y respira',
    how: 'Pellízcate la nariz e intenta inhalar.',
    dream: 'En un sueño podrás respirar igualmente.',
  },
  {
    title: 'Revisa un reloj',
    how: 'Mira la hora, desvía la vista y mira otra vez.',
    dream: 'La hora cambia de forma incoherente o los números no tienen sentido.',
  },
  {
    title: 'Pregúntate con intención',
    how: '«¿Estoy soñando?» Observa el entorno de verdad, sin responder en automático.',
    dream: 'Lo importante no es el truco, sino la atención genuina que le pones.',
  },
]

function Accordion({ item, open, onToggle }) {
  return (
    <article className="glass overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-5 text-left active:bg-white/[0.03]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-white">{item.name}</h3>
            <span className="rounded-full bg-aurora-400/10 px-2.5 py-0.5 text-xs font-medium text-aurora-300">
              {item.level}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{item.full}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.summary}</p>
        </div>
        <ChevronIcon
          className={`mt-1.5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="animate-rise space-y-3 border-t border-white/10 bg-black/10 p-5">
          {item.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dream-500/25 text-xs font-semibold text-dream-300">
                {i + 1}
              </span>
              <span className="selectable">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

export default function LucidGuide({ dreams }) {
  const [openId, setOpenId] = useState('mild')

  // Las 3 etiquetas más repetidas = tus señales oníricas personales
  const signs = useMemo(() => {
    const counts = new Map()
    for (const d of dreams) {
      for (const t of d.tags) {
        const k = t.toLowerCase()
        const entry = counts.get(k) || { name: t, count: 0 }
        entry.count++
        counts.set(k, entry)
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
      .slice(0, 3)
  }, [dreams])

  return (
    <div className="animate-rise space-y-6">
      <section className="glass rounded-3xl border-dream-400/20 p-5 shadow-glow">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dream-500/20 text-dream-300">
            <EyeIcon />
          </div>
          <h2 className="text-lg font-semibold text-white">Tus señales oníricas</h2>
        </div>
        {signs.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Cuando etiquetes tus sueños, aquí aparecerán los elementos que más se repiten. Son tus mejores
            disparadores para darte cuenta de que sueñas.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Estos elementos aparecen una y otra vez en tus sueños. Cuando los veas, haz un reality check.
            </p>
            <ul className="mt-4 space-y-2.5">
              {signs.map(({ name, count }) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {tagEmoji(name)}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-white">{name}</p>
                    <p className="text-xs text-slate-400">
                      {count} {count === 1 ? 'sueño' : 'sueños'} · Si aparece «{name}», pregúntate: ¿estoy soñando?
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="label !mb-1 px-1">Técnicas</h2>
        {TECHNIQUES.map((t) => (
          <Accordion key={t.id} item={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="label !mb-1 px-1">Reality checks</h2>
        <p className="px-1 text-sm leading-relaxed text-slate-400">
          Hazlos varias veces al día, con atención real, y siempre que veas una de tus señales oníricas. El hábito
          pasará a tus sueños.
        </p>
        <ul className="space-y-3">
          {REALITY_CHECKS.map((rc) => (
            <li key={rc.title} className="glass flex gap-3 rounded-3xl p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aurora-400/15 text-aurora-300">
                <CheckIcon width={16} height={16} />
              </span>
              <div className="min-w-0 text-sm leading-relaxed">
                <p className="font-semibold text-white">{rc.title}</p>
                <p className="text-slate-300">{rc.how}</p>
                <p className="mt-1 text-xs text-slate-500">En un sueño: {rc.dream}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

