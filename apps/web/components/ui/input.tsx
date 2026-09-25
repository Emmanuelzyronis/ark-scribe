import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-ark-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 rounded-input text-sm',
            'bg-ark-surface border border-ark-border',
            'text-ark-text-primary placeholder-ark-text-disabled',
            'focus:outline-none focus:border-ark-primary focus:ring-1 focus:ring-ark-primary',
            'transition-colors duration-200',
            error && 'border-ark-error focus:border-ark-error focus:ring-ark-error',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-ark-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
