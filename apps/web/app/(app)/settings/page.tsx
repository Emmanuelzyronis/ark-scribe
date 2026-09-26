'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { auth, vocabulary as vocabApi, audit as auditApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { User, BookOpen, Shield, Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Tab = 'profile' | 'vocabulary' | 'audit'

interface VocabEntry {
  id: string
  term: string
  phonetic_hint: string | null
  specialty: string | null
  context_hint: string | null
  active: boolean
  created_at: string
}

interface AuditEntry {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  ip_address: string | null
  created_at: string
}

export default function SettingsPage() {
  const { physician } = useAuth()
  const { success, error: showError } = useToast()
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: physician?.full_name || '',
    specialty: physician?.specialty || '',
    practice_name: physician?.practice_name || '',
    ehr_preference: physician?.ehr_preference || 'plain',
  })

  // Vocabulary state
  const [vocabItems, setVocabItems] = useState<VocabEntry[]>([])
  const [vocabLoading, setVocabLoading] = useState(false)
  const [vocabForm, setVocabForm] = useState({ term: '', phonetic_hint: '', specialty: '', context_hint: '' })
  const [addingVocab, setAddingVocab] = useState(false)

  // Audit state
  const [auditItems, setAuditItems] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTotal, setAuditTotal] = useState(0)

  useEffect(() => {
    if (physician) {
      setForm({
        full_name: physician.full_name || '',
        specialty: physician.specialty || '',
        practice_name: physician.practice_name || '',
        ehr_preference: physician.ehr_preference || 'plain',
      })
    }
  }, [physician])

  useEffect(() => {
    if (tab === 'vocabulary' && vocabItems.length === 0) {
      setVocabLoading(true)
      vocabApi.list()
        .then(r => { setVocabItems(r.data as VocabEntry[]); setVocabLoading(false) })
        .catch(err => { showError((err as Error).message); setVocabLoading(false) })
    }
    if (tab === 'audit' && auditItems.length === 0) {
      setAuditLoading(true)
      auditApi.list({ limit: 100 })
        .then(r => { setAuditItems(r.data as AuditEntry[]); setAuditTotal(r.total); setAuditLoading(false) })
        .catch(err => { showError((err as Error).message); setAuditLoading(false) })
    }
  }, [tab, vocabItems.length, auditItems.length, showError])

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    try {
      await auth.updateProfile(form)
      success('Profile updated successfully')
    } catch (err) {
      showError((err as Error).message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function addVocab() {
    if (!vocabForm.term.trim()) return
    setAddingVocab(true)
    try {
      const res = await vocabApi.create(vocabForm)
      setVocabItems(i => [res.vocabulary as VocabEntry, ...i])
      setVocabForm({ term: '', phonetic_hint: '', specialty: '', context_hint: '' })
      success('Term added')
    } catch (err) {
      showError((err as Error).message)
    } finally {
      setAddingVocab(false)
    }
  }

  async function removeVocab(id: string) {
    await vocabApi.delete(id)
    setVocabItems(i => i.filter(v => v.id !== id))
    success('Term removed')
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'vocabulary', label: 'Vocabulary', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'audit', label: 'HIPAA Audit', icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-heading-2 font-bold text-ark-text-primary mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ark-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-ark-primary text-ark-primary'
                : 'border-transparent text-ark-text-secondary hover:text-ark-text-primary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="rounded-card bg-ark-surface border border-ark-border p-6">
          <div className="space-y-4">
            <Input label="Full Name" value={form.full_name} onChange={e => setField('full_name', e.target.value)} />
            <Input label="Specialty" value={form.specialty} onChange={e => setField('specialty', e.target.value)} />
            <Input label="Practice Name" value={form.practice_name} onChange={e => setField('practice_name', e.target.value)} />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ark-text-secondary mb-1.5">
                Default EHR Format
              </label>
              <select
                value={form.ehr_preference}
                onChange={e => setField('ehr_preference', e.target.value)}
                className="w-full px-4 py-2.5 rounded-input text-sm bg-ark-surface border border-ark-border text-ark-text-primary focus:outline-none focus:border-ark-primary"
              >
                <option value="plain">Plain Text</option>
                <option value="epic">Epic</option>
                <option value="athena">Athena Health</option>
                <option value="drchrono">DrChrono</option>
              </select>
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary Tab */}
      {tab === 'vocabulary' && (
        <div className="space-y-4">
          <div className="rounded-card bg-ark-surface border border-ark-border p-5">
            <h2 className="text-sm font-semibold text-ark-text-primary mb-4">Add Term</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Term" value={vocabForm.term} onChange={e => setVocabForm(f => ({ ...f, term: e.target.value }))} placeholder="Lisinopril" />
              <Input label="Specialty" value={vocabForm.specialty} onChange={e => setVocabForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Cardiology" />
              <Input label="Phonetic Hint" value={vocabForm.phonetic_hint} onChange={e => setVocabForm(f => ({ ...f, phonetic_hint: e.target.value }))} placeholder="lih-SIN-oh-pril" />
              <Input label="Context" value={vocabForm.context_hint} onChange={e => setVocabForm(f => ({ ...f, context_hint: e.target.value }))} placeholder="ACE inhibitor" />
            </div>
            <Button onClick={addVocab} loading={addingVocab} size="sm">
              <Plus className="w-4 h-4" />
              Add Term
            </Button>
          </div>
          <div className="space-y-2">
            {vocabLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-12 rounded-card skeleton" />)
            ) : vocabItems.length === 0 ? (
              <div className="rounded-card bg-ark-surface border border-ark-border p-5">
                <p className="text-sm font-medium text-ark-text-primary mb-2">No terms added yet</p>
                <p className="text-xs text-ark-text-muted mb-4">
                  Add specialty-specific terms to improve transcription accuracy. Click any example to pre-fill:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { term: 'Lisinopril', phonetic_hint: 'lih-SIN-oh-pril', context_hint: 'ACE inhibitor' },
                    { term: 'Metformin', phonetic_hint: 'met-FOR-min', context_hint: 'Type 2 DM' },
                    { term: 'Troponin', phonetic_hint: 'TROP-oh-nin', context_hint: 'Cardiac marker' },
                    { term: 'Dyspnea', phonetic_hint: 'DISP-nee-ah', context_hint: 'Shortness of breath' },
                    { term: 'Tachycardia', phonetic_hint: 'tak-ih-KAR-dee-ah', context_hint: 'Fast heart rate' },
                  ].map(ex => (
                    <button
                      key={ex.term}
                      onClick={() => setVocabForm(f => ({ ...f, term: ex.term, phonetic_hint: ex.phonetic_hint, context_hint: ex.context_hint }))}
                      className="px-3 py-1.5 rounded-badge border border-ark-border bg-ark-surface-elevated text-xs text-ark-text-secondary hover:border-ark-primary hover:text-ark-primary transition-colors"
                    >
                      {ex.term}
                    </button>
                  ))}
                </div>
              </div>
            ) : vocabItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-card bg-ark-surface border border-ark-border">
                <div>
                  <span className="text-sm font-medium text-ark-text-primary">{item.term}</span>
                  {item.specialty && <span className="ml-2 text-xs text-ark-text-muted">{item.specialty}</span>}
                  {item.context_hint && <span className="ml-2 text-xs text-ark-text-disabled">· {item.context_hint}</span>}
                </div>
                <button onClick={() => removeVocab(item.id)} className="p-1.5 text-ark-text-muted hover:text-ark-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ark-text-muted">{auditTotal} total events</p>
          </div>
          <div className="rounded-card bg-ark-surface border border-ark-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ark-surface-elevated border-b border-ark-border">
                <tr>
                  {['Timestamp', 'Action', 'Resource', 'IP'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ark-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="border-b border-ark-border">
                      {[1, 2, 3, 4].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-4 skeleton rounded w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : auditItems.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-ark-text-muted">No audit events recorded</td></tr>
                ) : auditItems.map(item => (
                  <tr key={item.id} className="border-b border-ark-border hover:bg-ark-surface-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-ark-text-muted font-mono">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-badge bg-ark-primary-muted text-ark-primary text-xs">{item.action}</span></td>
                    <td className="px-4 py-3 text-xs text-ark-text-secondary">{item.resource_type}</td>
                    <td className="px-4 py-3 text-xs text-ark-text-disabled font-mono">{item.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
