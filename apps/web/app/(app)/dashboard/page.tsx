'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Clock, Copy, Trash2, Mic, Filter } from 'lucide-react'
import { encounters } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { formatDate, formatDuration, copyToClipboard } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface Encounter {
  id: string
  title: string
  status: string
  duration_seconds: number | null
  specialty?: string
  created_at: string
  finalized_at: string | null
}

function EncounterCardSkeleton() {
  return (
    <div className="p-5 rounded-card bg-ark-surface border border-ark-border animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 bg-ark-surface-elevated rounded w-48 mb-2 skeleton" />
          <div className="h-4 bg-ark-surface-elevated rounded w-32 skeleton" />
        </div>
        <div className="h-6 w-20 bg-ark-surface-elevated rounded skeleton" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { success, error: showError } = useToast()
  const [list, setList] = useState<Encounter[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await encounters.list({ status: statusFilter || undefined, search: search || undefined })
      setList(res.data as Encounter[])
      setTotal(res.total)
    } catch (err) {
      showError((err as Error).message || 'Failed to load encounters')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, showError])

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function createNew() {
    try {
      const { encounter } = await encounters.create()
      window.location.href = `/record?id=${(encounter as Encounter).id}`
    } catch (err) {
      showError((err as Error).message || 'Failed to create encounter')
    }
  }

  async function handleCopy(id: string) {
    try {
      const res = await encounters.exportNote(id, 'plain')
      await copyToClipboard(res.formatted_note)
      success('Note copied to clipboard!')
    } catch {
      showError('No note generated yet for this encounter')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this encounter?')) return
    try {
      await encounters.delete(id)
      setList(l => l.filter(e => e.id !== id))
      success('Encounter deleted')
    } catch (err) {
      showError((err as Error).message || 'Delete failed')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-2 font-bold text-ark-text-primary">Note History</h1>
          <p className="text-body-sm text-ark-text-secondary mt-0.5">
            {total} encounter{total !== 1 ? 's' : ''} · {list.filter(e => e.status === 'finalized').length} finalized
          </p>
        </div>
        <Button onClick={createNew} size="lg">
          <Plus className="w-4 h-4" />
          New Recording
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ark-text-disabled" />
          <input
            type="text"
            placeholder="Search encounters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-input text-sm bg-ark-surface border border-ark-border text-ark-text-primary placeholder-ark-text-disabled focus:outline-none focus:border-ark-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-ark-text-muted" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-input text-sm bg-ark-surface border border-ark-border text-ark-text-primary focus:outline-none focus:border-ark-primary transition-colors"
          >
            <option value="">All Status</option>
            <option value="recording">Recording</option>
            <option value="processing">Processing</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <EncounterCardSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-ark-primary-muted flex items-center justify-center mx-auto mb-6">
            <Mic className="w-10 h-10 text-ark-primary" />
          </div>
          <h3 className="text-heading-3 font-semibold text-ark-text-primary mb-2">
            {search || statusFilter ? 'No encounters found' : 'No notes yet'}
          </h3>
          <p className="text-body-sm text-ark-text-secondary mb-6 max-w-sm mx-auto">
            {search || statusFilter
              ? 'Try adjusting your search or filter'
              : 'Start your first patient encounter recording to generate SOAP notes.'}
          </p>
          {!search && !statusFilter && (
            <Button onClick={createNew} size="lg">
              <Plus className="w-4 h-4" />
              Start Recording
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(enc => (
            <div
              key={enc.id}
              className="group p-5 rounded-card bg-ark-surface border border-ark-border hover:border-ark-primary/40 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/note/${enc.id}`} className="flex-1 min-w-0 hover:opacity-80">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-ark-text-primary truncate">{enc.title || 'Unnamed encounter'}</h3>
                    <StatusBadge status={enc.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ark-text-muted">
                    <span>{formatDate(enc.created_at)}</span>
                    {enc.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(enc.duration_seconds)}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(enc.status === 'draft' || enc.status === 'finalized') && (
                    <button
                      onClick={() => handleCopy(enc.id)}
                      title="Copy note"
                      className="p-1.5 rounded-input text-ark-text-muted hover:text-ark-primary hover:bg-ark-primary-muted transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(enc.id)}
                    title="Delete"
                    className="p-1.5 rounded-input text-ark-text-muted hover:text-ark-error hover:bg-red-900/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
