import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'error' | 'info' | 'recording'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-ark-surface text-ark-text-secondary border border-ark-border',
    primary: 'bg-green-900/40 text-ark-primary border border-ark-border',
    accent: 'bg-lime-900/40 text-ark-accent border border-lime-800',
    warning: 'bg-yellow-900/40 text-ark-warning border border-yellow-800',
    error: 'bg-red-900/40 text-ark-error border border-red-800',
    info: 'bg-blue-900/40 text-ark-info border border-blue-800',
    recording: 'bg-red-900/40 text-ark-recording border border-red-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string; dot?: boolean }> = {
    recording: { variant: 'recording', label: 'Recording', dot: true },
    processing: { variant: 'info', label: 'Processing', dot: true },
    draft: { variant: 'warning', label: 'Draft' },
    finalized: { variant: 'primary', label: 'Finalized' },
  }

  const { variant, label, dot } = config[status] || { variant: 'default', label: status }

  return (
    <Badge variant={variant}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', status === 'recording' ? 'bg-ark-recording animate-pulse' : 'bg-ark-info animate-pulse')} />
      )}
      {label}
    </Badge>
  )
}
