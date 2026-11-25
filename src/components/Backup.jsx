import { useRef, useState } from 'react'
import { buildBackup, parseBackup } from '../lib/storage.js'
import { DownloadIcon, LockIcon, UploadIcon } from './icons.jsx'

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function Backup({ dreams, onImport, notify }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `diario-de-suenos-${stamp}.json`
    const json = JSON.stringify(buildBackup(dreams), null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    try {
      // En móvil (y en el WebView de Capacitor) la hoja "Compartir" permite guardar el archivo
      const file = new File([blob], filename, { type: 'application/json' })
      if (isMobile() && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Copia de seguridad - Diario de Sueños' })
        notify('Copia de seguridad lista')
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return // el usuario cerró la hoja de compartir
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    notify(`Exportados ${dreams.length} sueños`)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { dreams: incoming, skipped } = parseBackup(await file.text())
      const { added, updated } = onImport(incoming)
      const parts = [`${added} nuevos`]
      if (updated) parts.push(`${updated} actualizados`)
      if (skipped) parts.push(`${skipped} omitidos`)
      notify(`Importación: ${parts.join(', ')}`)
    } catch (err) {
      notify(err.message || 'No se pudo importar el archivo', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-rise space-y-5">
      <div className="glass flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-dream-500/20 text-3xl">
          📓
        </div>
        <div>
          <p className="text-3xl font-semibold leading-none text-white">{dreams.length}</p>
          <p className="mt-1 text-sm text-slate-400">
            {dreams.length === 1 ? 'sueño guardado' : 'sueños guardados'} en este dispositivo
          </p>
        </div>
      </div>

      <button
        id="export-json"
        type="button"
        onClick={handleExport}
        disabled={dreams.length === 0}
        className="btn-primary w-full"
      >
        <DownloadIcon /> Exportar copia (JSON)
      </button>

      <button
        id="import-json"
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="btn-ghost w-full"
      >
        <UploadIcon /> Importar copia (JSON)
      </button>
      <input
        ref={fileRef}
        id="import-file"
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />

      <div className="glass flex gap-3 rounded-3xl p-5 text-sm leading-relaxed text-slate-400">
        <LockIcon className="mt-0.5 shrink-0 text-aurora-300" />
        <p>
          Tus sueños son privados: se guardan solo en este dispositivo. Únicamente salen de él, de forma
          anónima, cuando tú pides un análisis con IA. Exporta una copia de vez en cuando para no
          perderlos si borras los datos de la app o cambias de teléfono. Al importar, los sueños se{' '}
          <strong className="text-slate-200">fusionan</strong> con los actuales sin duplicarlos.
        </p>
      </div>
    </div>
  )
}
