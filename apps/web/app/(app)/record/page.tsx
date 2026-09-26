'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mic, MicOff, Square, Zap, Clock, CheckCircle } from 'lucide-react'
import { encounters } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth'
import { formatDuration } from '@/lib/utils'

interface TranscriptWord {
  word: string
  start_ms: number
  end_ms: number
  confidence: number
}

function RecordingWaveform({ isRecording }: { isRecording: boolean }) {
  const bars = Array.from({ length: 20 }, (_, i) => i)
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {bars.map(i => (
        <div
          key={i}
          className="w-1 bg-ark-primary rounded-full transition-all"
          style={{
            height: isRecording ? `${20 + Math.random() * 80}%` : '20%',
            animationDelay: `${i * 0.05}s`,
            animation: isRecording ? `wave-bar ${0.8 + Math.random() * 0.4}s ease-in-out infinite` : 'none',
          }}
        />
      ))}
    </div>
  )
}

const GENERATION_STEPS = [
  'Redacting PHI…',
  'Analyzing transcript…',
  'Generating SOAP note…',
  'Adding ICD-10 codes…',
] as const

function GenerationProgress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {GENERATION_STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={label} className="flex items-center gap-3 text-sm">
            {done ? (
              <CheckCircle className="w-4 h-4 text-ark-primary flex-shrink-0" aria-hidden="true" />
            ) : active ? (
              <div className="w-4 h-4 rounded-full border-2 border-ark-primary border-t-transparent animate-spin flex-shrink-0" aria-hidden="true" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-ark-border flex-shrink-0" aria-hidden="true" />
            )}
            <span className={done ? 'text-ark-text-muted line-through' : active ? 'text-ark-text-primary font-medium' : 'text-ark-text-disabled'}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RecordPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const encounterId = searchParams?.get('id') || null
  const { success, error: showError, info } = useToast()
  const { physician } = useAuth()

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [words, setWords] = useState<TranscriptWord[]>([])
  const [rawText, setRawText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(-1)
  const [currentId, setCurrentId] = useState(encounterId)
  const [muted, setMuted] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)
  const wordCountRef = useRef(0)

  // Simulated real-time transcription (in production: connect to AssemblyAI WebSocket)
  const simulateTranscript = useCallback(() => {
    const sampleWords = [
      "Patient", "presents", "with", "chief", "complaint", "of", "chest", "pain",
      "for", "the", "past", "three", "days.", "Pain", "is", "described", "as",
      "sharp", "and", "radiating", "to", "the", "left", "arm.", "Patient", "denies",
      "shortness", "of", "breath", "or", "diaphoresis.", "PMH", "significant", "for",
      "hypertension", "and", "type", "2", "diabetes.", "Current", "medications", "include",
      "Lisinopril", "10mg", "daily", "and", "Metformin", "1000mg", "twice", "daily.",
      "Vital", "signs:", "BP", "145/92,", "HR", "88,", "RR", "16,", "O2", "sat", "98%",
      "on", "room", "air.", "Physical", "exam", "reveals", "mild", "tenderness", "to",
      "palpation", "at", "the", "left", "sternal", "border.", "EKG", "shows", "normal",
      "sinus", "rhythm.", "Assessment:", "likely", "musculoskeletal", "chest", "pain",
      "given", "clinical", "presentation.", "Plan", "to", "prescribe", "NSAIDs",
      "and", "follow", "up", "in", "one", "week."
    ]

    const interval = setInterval(() => {
      if (wordCountRef.current >= sampleWords.length) {
        clearInterval(interval)
        return
      }

      const now = Date.now() - startTimeRef.current
      const word = sampleWords[wordCountRef.current]
      const newWord: TranscriptWord = {
        word,
        start_ms: now,
        end_ms: now + 400,
        confidence: 0.95 + Math.random() * 0.05,
      }

      setWords(prev => [...prev, newWord])
      setRawText(prev => prev + (prev ? ' ' : '') + word)
      wordCountRef.current++

      // Auto scroll
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
      }
    }, 300)

    return () => clearInterval(interval)
  }, [])

  const startRecording = useCallback(async () => {
    if (physician && !physician.specialty) {
      info('Tip: add your specialty in Settings for more accurate notes.')
    }

    try {
      // Create encounter if not already created
      let id = currentId
      if (!id) {
        const res = await encounters.create({ title: `Encounter ${new Date().toLocaleDateString()}` })
        id = (res.encounter as { id: string }).id
        setCurrentId(id)
      }

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()

      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)
      setWords([])
      setRawText('')
      wordCountRef.current = 0
      startTimeRef.current = Date.now()

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      // Start simulated transcription
      const cleanup = simulateTranscript()

      info('Recording started. Speak naturally.')

      return cleanup
    } catch (err) {
      showError('Microphone access denied. Please allow microphone access to record.')
      console.error(err)
    }
  }, [currentId, simulateTranscript, info, showError])

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }

    setIsRecording(false)
    success('Recording stopped. Ready to generate note.')
  }, [success])

  function toggleMute() {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = muted })
      setMuted(!muted)
    }
  }

  async function generateNote() {
    if (!currentId || rawText.length < 10) {
      showError('Need a transcript to generate a note. Please record first.')
      return
    }

    setGenerating(true)
    setGenerationStep(0)

    try {
      // Step 0: Redact PHI + finalize transcript
      await encounters.finalizeTranscript(currentId, { raw_text: rawText, words })
      setGenerationStep(1)

      // Steps 1-3 are inside the API call; animate them on the client side
      const stepTimer1 = setTimeout(() => setGenerationStep(2), 800)
      const stepTimer2 = setTimeout(() => setGenerationStep(3), 1800)

      const res = await encounters.generateNote(currentId, rawText, physician?.specialty || undefined)

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setGenerationStep(GENERATION_STEPS.length) // all done

      success(`SOAP note generated in ${Math.round((res.generation_ms || 0) / 100) / 10}s!`)
      router.push(`/note/${currentId}`)
    } catch (err) {
      setGenerationStep(-1)
      showError((err as Error).message || 'Note generation failed')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-ark-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ark-border bg-ark-surface">
        <div>
          <h1 className="text-lg font-bold text-ark-text-primary">New Recording</h1>
          <p className="text-xs text-ark-text-muted">
            {currentId ? `Encounter #${currentId.slice(0, 6).toUpperCase()}` : 'Ready to record'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2 text-ark-recording">
              <div className="w-2 h-2 rounded-full bg-ark-recording animate-pulse" />
              <span className="text-sm font-mono font-bold">{formatDuration(duration)}</span>
            </div>
          )}

          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={generateNote}
              loading={generating && generationStep < 0}
              disabled={isRecording || words.length === 0 || generating}
              size="lg"
              className="px-6"
            >
              <Zap className="w-4 h-4" />
              {generating ? 'Generating…' : 'Generate Note'}
            </Button>
            {generating && generationStep >= 0 && (
              <GenerationProgress step={generationStep} />
            )}
          </div>
        </div>
      </div>

      {/* Waveform + Controls */}
      <div className="px-6 py-6 border-b border-ark-border bg-ark-surface/50">
        <div className="max-w-2xl mx-auto">
          <RecordingWaveform isRecording={isRecording && !isPaused} />

          <div className="flex items-center justify-center gap-4 mt-4">
            {!isRecording ? (
              <Button onClick={startRecording} size="xl" className="gap-3">
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-pressed={muted}
                  className="w-12 h-12 rounded-full bg-ark-surface border border-ark-border flex items-center justify-center hover:border-ark-primary transition-all"
                >
                  {muted ? <MicOff className="w-5 h-5 text-ark-error" aria-hidden="true" /> : <Mic className="w-5 h-5 text-ark-primary" aria-hidden="true" />}
                </button>

                <button
                  onClick={stopRecording}
                  aria-label="Stop recording"
                  className="w-20 h-20 rounded-full bg-ark-error flex items-center justify-center recording-pulse hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Square className="w-7 h-7 text-white fill-white" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {isRecording && (
            <p className="text-center text-xs text-ark-text-muted mt-3">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatDuration(duration)} · {words.length} words transcribed
            </p>
          )}
        </div>
      </div>

      {/* Live Transcript */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ark-text-secondary uppercase tracking-wider">Live Transcript</h2>
            {words.length > 0 && (
              <span className="text-xs text-ark-text-muted">{words.length} words</span>
            )}
          </div>

          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto rounded-card bg-ark-surface border border-ark-border p-4 font-mono text-sm text-ark-text-secondary leading-relaxed"
          >
            {words.length === 0 ? (
              <div className="h-full flex items-center justify-center text-ark-text-disabled">
                {isRecording ? 'Listening...' : 'Start recording to see live transcript'}
              </div>
            ) : (
              <div>
                {words.map((w, i) => (
                  <span
                    key={i}
                    className="transition-colors duration-200"
                    style={{
                      color: i === words.length - 1 ? 'var(--primary)' : 'var(--foreground-secondary)',
                    }}
                  >
                    {w.word}{' '}
                  </span>
                ))}
                {isRecording && <span className="inline-block w-2 h-4 bg-ark-primary animate-pulse ml-0.5 align-middle" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-ark-bg">
        <div className="flex items-center gap-3 text-ark-text-secondary">
          <svg className="animate-spin h-5 w-5 text-ark-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Preparing recorder...</span>
        </div>
      </div>
    }>
      <RecordPageInner />
    </Suspense>
  )
}
