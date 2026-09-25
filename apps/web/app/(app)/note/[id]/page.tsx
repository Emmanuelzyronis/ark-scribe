'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Edit3, Check, X, RefreshCw, CheckCircle, Loader } from 'lucide-react'
import Link from 'next/link'
import { encounters } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { copyToClipboard, formatDate } from '@/lib/utils'

interface SOAPNote {
  id: string
  encounter_id: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  icd10_codes: string[]
  medications: string[]
  generation_ms?: number
  created_at: string
  updated_at: string
}

interface Transcript {
  id: string
  raw_text: string
  redacted_text: string
  words: Array<{ word: string; start_ms: number; end_ms: number }>
  created_at: string
}

interface Encounter {
  id: string
  title: string
  status: string
  duration_seconds: number | null
  created_at: string
}

type SOAPSection = 'subjective' | 'objective' | 'assessment' | 'plan'

const SECTION_LABELS: Record<SOAPSection, { abbr: string; full: string; color: string }> = {
  subjective: { abbr: 'S', full: 'Subjective', color: 'text-blue-400' },
  objective: { abbr: 'O', full: 'Objective', color: 'text-purple-400' },
  assessment: { abbr: 'A', full: 'Assessment', color: 'text-amber-400' },
  plan: { abbr: 'P', full: 'Plan', color: 'text-ark-primary' },
}

interface SectionEditorProps {
  section: SOAPSection
  value: string
  encounterId: string
  onUpdate: (text: string) => void
}

function SectionEditor({ section, value, encounterId, onUpdate }: SectionEditorProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [rewriting, setRewriting] = useState(false)
  const [instruction, setInstruction] = useState('')
  const { success, error: showError } = useToast()
  const { abbr, full, color } = SECTION_LABELS[section]

  useEffect(() => { setText(value) }, [value])

  async function save() {
    try {
      await encounters.updateNote(encounterId, { [section]: text })
      onUpdate(text)
      setEditing(false)
      success(`${full} section updated`)
    } catch (err) {
      showError((err as Error).message || 'Save failed')
    }
  }

  async function rewrite() {
    setRewriting(true)
    try {
      const res = await encounters.rewriteSection(encounterId, {
        section,
        current_text: text,
        instruction: instruction || `Improve clarity and completeness of the ${full} section`,
      })
      setText(res.rewritten_text)
      onUpdate(res.rewritten_text)
      success('Section rewritten by Claude')
      setInstruction('')
    } catch (err) {
      showError((err as Error).message || 'Rewrite failed')
    } finally {
      setRewriting(false)
    }
  }

  return (
    <div className="border border-ark-border rounded-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-ark-surface-elevated border-b border-ark-border">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center bg-ark-surface ${color}`}>
            {abbr}
          </span>
          <span className="text-sm font-semibold text-ark-text-primary">{full}</span>
          {value && <span className="text-xs text-ark-text-disabled">{value.split(' ').length} words</span>}
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-ark-text-muted hover:text-ark-primary transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setText(value); setEditing(false) }} className="text-xs text-ark-text-muted hover:text-ark-error">
              <X className="w-4 h-4" />
            </button>
            <button onClick={save} className="text-xs text-ark-primary hover:text-ark-accent">
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="p-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="w-full bg-ark-bg border border-ark-border rounded-input px-3 py-2 text-sm text-ark-text-primary placeholder-ark-text-disabled focus:outline-none focus:border-ark-primary resize-none"
          />
          <div className="flex gap-2 mt-2">
            <input
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="Claude instruction (e.g., add more detail about medications)"
              className="flex-1 px-3 py-1.5 rounded-input text-xs bg-ark-surface border border-ark-border text-ark-text-primary placeholder-ark-text-disabled focus:outline-none focus:border-ark-primary"
            />
            <Button
              onClick={rewrite}
              loading={rewriting}
              variant="secondary"
              size="sm"
              className="whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rewrite with Claude
            </Button>
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <Button onClick={() => { setText(value); setEditing(false) }} variant="ghost" size="sm">Cancel</Button>
            <Button onClick={save} size="sm">Save</Button>
          </div>
        </div>
      ) : (
        <div
          className="px-4 py-4 text-sm text-ark-text-secondary whitespace-pre-wrap cursor-text hover:bg-ark-surface/30 transition-colors min-h-[80px]"
          onClick={() => setEditing(true)}
        >
          {value || <span className="text-ark-text-disabled italic">No content yet — click to add</span>}
        </div>
      )}
    </div>
  )
}

export default function NotePage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''
  const { success, error: showError } = useToast()

  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [note, setNote] = useState<SOAPNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyFormat, setCopyFormat] = useState('plain')
  const [finalizing, setFinalizing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await encounters.get(id)
      setEncounter(res.encounter as Encounter)
      setTranscript(res.transcript as Transcript | null)
      setNote(res.soap_note as SOAPNote | null)
    } catch (err) {
      showError((err as Error).message || 'Failed to load encounter')
    } finally {
      setLoading(false)
    }
  }, [id, showError])

  useEffect(() => { load() }, [load])

  async function generateNote() {
    if (!transcript?.raw_text) return showError('No transcript available')
    setGenerating(true)
    try {
      const res = await encounters.generateNote(id, transcript.redacted_text || transcript.raw_text)
      setNote(res.soap_note as SOAPNote)
      setEncounter(e => e ? { ...e, status: 'draft' } : e)
      success(`SOAP note generated in ${Math.round((res.generation_ms || 0) / 100) / 10}s!`)
    } catch (err) {
      showError((err as Error).message || 'Note generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    setCopying(true)
    try {
      const res = await encounters.exportNote(id, copyFormat)
      await copyToClipboard(res.formatted_note)
      success(`Note copied in ${copyFormat} format!`)
    } catch (err) {
      showError((err as Error).message || 'Copy failed')
    } finally {
      setCopying(false)
    }
  }

  async function finalize() {
    setFinalizing(true)
    try {
      await encounters.update(id, { status: 'finalized' })
      setEncounter(e => e ? { ...e, status: 'finalized' } : e)
      success('Encounter finalized!')
    } catch (err) {
      showError((err as Error).message || 'Finalize failed')
    } finally {
      setFinalizing(false)
    }
  }

  function updateSection(section: SOAPSection) {
    return (text: string) => {
      setNote(n => n ? { ...n, [section]: text } : n)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 animate-spin text-ark-primary" />
      </div>
    )
  }

  if (!encounter) {
    return (
      <div className="p-6 text-center text-ark-text-secondary">
        <p>Encounter not found.</p>
        <Button onClick={() => router.push('/dashboard')} variant="ghost" className="mt-4">Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ark-border bg-ark-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="p-1.5 rounded-input hover:bg-ark-surface-elevated text-ark-text-muted hover:text-ark-text-primary transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-ark-text-primary">{encounter.title}</h1>
              <StatusBadge status={encounter.status} />
            </div>
            <p className="text-xs text-ark-text-muted">{formatDate(encounter.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!note && transcript && (
            <Button onClick={generateNote} loading={generating} size="md">
              Generate SOAP Note
            </Button>
          )}

          {note && (
            <>
              <div className="flex items-center gap-1 bg-ark-surface border border-ark-border rounded-input">
                <select
                  value={copyFormat}
                  onChange={e => setCopyFormat(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-transparent text-ark-text-secondary focus:outline-none"
                >
                  <option value="plain">Plain Text</option>
                  <option value="epic">Epic</option>
                  <option value="athena">Athena</option>
                  <option value="drchrono">DrChrono</option>
                </select>
              </div>
              <Button onClick={handleCopy} loading={copying} variant="secondary" size="md">
                <Copy className="w-4 h-4" />
                Copy Note
              </Button>

              {encounter.status === 'draft' && (
                <Button onClick={finalize} loading={finalizing} variant="accent" size="md">
                  <CheckCircle className="w-4 h-4" />
                  Finalize
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content: side by side */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Transcript */}
        <div className="w-2/5 border-r border-ark-border flex flex-col">
          <div className="px-4 py-3 border-b border-ark-border bg-ark-surface-elevated">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ark-text-secondary">Transcript</h2>
            {transcript && (
              <p className="text-xs text-ark-text-disabled mt-0.5">
                {transcript.words?.length || transcript.raw_text?.split(' ').length || 0} words
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 font-mono text-xs text-ark-text-secondary leading-relaxed">
            {transcript ? (
              transcript.raw_text || 'No transcript text'
            ) : (
              <p className="text-ark-text-disabled italic">No transcript recorded</p>
            )}
          </div>
        </div>

        {/* Right: SOAP Note */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ark-text-secondary">SOAP Note</h2>
            {note && (
              <p className="text-xs text-ark-text-disabled">
                Generated {formatDate(note.created_at)}
                {note.generation_ms && ` · ${Math.round(note.generation_ms / 100) / 10}s`}
              </p>
            )}
          </div>

          {note ? (
            <>
              {(['subjective', 'objective', 'assessment', 'plan'] as SOAPSection[]).map(section => (
                <SectionEditor
                  key={section}
                  section={section}
                  value={note[section]}
                  encounterId={id}
                  onUpdate={updateSection(section)}
                />
              ))}

              {note.icd10_codes?.length > 0 && (
                <div className="p-4 rounded-card bg-ark-surface border border-ark-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ark-text-secondary mb-2">ICD-10 Codes</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.icd10_codes.map(code => (
                      <span key={code} className="px-2 py-1 rounded-badge bg-ark-primary-muted text-ark-primary text-xs font-mono">{code}</span>
                    ))}
                  </div>
                </div>
              )}

              {note.medications?.length > 0 && (
                <div className="p-4 rounded-card bg-ark-surface border border-ark-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ark-text-secondary mb-2">Medications</h3>
                  <ul className="space-y-1">
                    {note.medications.map(med => (
                      <li key={med} className="text-sm text-ark-text-secondary flex items-start gap-2">
                        <span className="text-ark-primary mt-0.5">•</span>
                        {med}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-ark-primary-muted flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-ark-primary" />
              </div>
              <h3 className="text-base font-semibold text-ark-text-primary mb-2">No SOAP note yet</h3>
              <p className="text-sm text-ark-text-secondary mb-4">
                {transcript ? 'Click Generate to create the SOAP note from the transcript' : 'Record a patient encounter first'}
              </p>
              {transcript && (
                <Button onClick={generateNote} loading={generating}>
                  Generate SOAP Note
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
