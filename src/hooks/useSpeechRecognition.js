import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook para reconocimiento de voz usando la Web Speech API nativa.
 * Compatible con Chrome, Edge, Safari (WebKit) y navegadores móviles modernos.
 *
 * @param {Object} options
 * @param {string} [options.lang='es-CO'] - Idioma del reconocimiento.
 * @param {Function} [options.onFinalTranscript] - Callback ejecutado con cada fragmento final confirmado.
 */
export default function useSpeechRecognition({
  lang = 'es-CO',
  onFinalTranscript,
} = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const shouldListenRef = useRef(false)
  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  // Detección de compatibilidad en navegador (SSR-safe)
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i]
        const text = item[0]?.transcript || ''
        if (item.isFinal) {
          finalChunk += text
        } else {
          interim += text
        }
      }

      if (finalChunk) {
        const cleanChunk = finalChunk.trim()
        if (cleanChunk) {
          setTranscript((prev) => (prev ? `${prev} ${cleanChunk}` : cleanChunk))
          onFinalRef.current?.(cleanChunk)
        }
      }

      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      const err = event.error

      // 'aborted' es normal al detener manualmente
      if (err === 'aborted') return

      if (err === 'not-allowed') {
        shouldListenRef.current = false
        setIsListening(false)
        setError('Permiso de micrófono denegado. Habilita el acceso en tu navegador para dictar.')
        return
      }

      if (err === 'service-not-allowed') {
        shouldListenRef.current = false
        setIsListening(false)
        setError('El servicio de reconocimiento de voz no está permitido en este dispositivo.')
        return
      }

      if (err === 'audio-capture') {
        shouldListenRef.current = false
        setIsListening(false)
        setError('No se detectó ningún micrófono. Conecta un dispositivo de entrada.')
        return
      }

      if (err === 'network') {
        setError('Error de red al procesar el reconocimiento de voz. Revisa tu conexión.')
        return
      }

      if (err === 'no-speech') {
        // Pausa prolongada del usuario; se informa sutilmente sin cortar la intención
        setError('No se detectó voz. Habla más cerca del micrófono.')
        return
      }

      setError(`Error en el reconocimiento de voz (${err}).`)
    }

    recognition.onend = () => {
      // Si el usuario no ha pulsado detener intencionalmente, reconectar (Chrome corta tras pausas de silencio)
      if (shouldListenRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // Si falla el reinicio automático, sincronizar estado
        }
      }

      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      shouldListenRef.current = false
      try {
        recognition.abort()
      } catch {}
      recognitionRef.current = null
    }
  }, [isSupported, lang])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('El reconocimiento de voz no es compatible con este navegador.')
      return
    }

    setError('')
    setInterimTranscript('')
    shouldListenRef.current = true

    try {
      recognitionRef.current?.start()
      setIsListening(true)
    } catch (err) {
      // Ignorar si ya estaba iniciado (InvalidStateError)
      if (err?.name === 'InvalidStateError') {
        setIsListening(true)
      } else {
        setError('No se pudo acceder al micrófono: ' + (err?.message || 'Error desconocido.'))
      }
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {}
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError('')
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
  }
}
