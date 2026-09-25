import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'recording': return 'text-ark-recording bg-red-900/30 border-red-800'
    case 'processing': return 'text-ark-info bg-blue-900/30 border-blue-800'
    case 'draft': return 'text-ark-warning bg-yellow-900/30 border-yellow-800'
    case 'finalized': return 'text-ark-primary bg-green-900/30 border-ark-border'
    default: return 'text-ark-text-muted bg-ark-surface border-ark-border'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'recording': return 'Recording'
    case 'processing': return 'Processing'
    case 'draft': return 'Draft'
    case 'finalized': return 'Finalized'
    default: return status
  }
}
