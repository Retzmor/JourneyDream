import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadDreams,
  saveDreams,
  newId,
  mergeDreams,
  requestPersistentStorage,
} from '../lib/storage.js'

export default function useDreams() {
  const [dreams, setDreams] = useState(loadDreams)
  const [saveError, setSaveError] = useState(false)
  const firstRun = useRef(true)

  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // Persistencia automática en LocalStorage ante cualquier cambio
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setSaveError(!saveDreams(dreams))
  }, [dreams])

  const addDream = useCallback((data) => {
    const now = Date.now()
    const dream = { ...data, id: newId(), createdAt: now, updatedAt: now }
    setDreams((prev) => [dream, ...prev])
    return dream
  }, [])

  const updateDream = useCallback((id, data) => {
    setDreams((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: Date.now() } : d)),
    )
  }, [])

  const deleteDream = useCallback((id) => {
    setDreams((prev) => prev.filter((d) => d.id !== id))
  }, [])

  /** Guarda (o reemplaza) el análisis de IA de un sueño sin alterar el resto de sus datos. */
  const setAiAnalysis = useCallback((id, aiAnalysis) => {
    setDreams((prev) =>
      prev.map((d) => (d.id === id ? { ...d, aiAnalysis, updatedAt: Date.now() } : d)),
    )
  }, [])

  /** Importa fusionando con los existentes. Devuelve {added, updated}. */
  const importDreams = useCallback(
    (incoming) => {
      const { merged, added, updated } = mergeDreams(dreams, incoming)
      setDreams(merged)
      return { added, updated }
    },
    [dreams],
  )

  return { dreams, saveError, addDream, updateDream, deleteDream, setAiAnalysis, importDreams }
}
