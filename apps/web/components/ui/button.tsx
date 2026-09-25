import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-ark-primary text-ark-bg hover:bg-ark-primary-hover shadow-primary-glow/50 hover:shadow-primary-glow',
      secondary: 'bg-ark-surface border border-ark-border text-ark-text-primary hover:bg-ark-surface-elevated hover:border-ark-primary',
      ghost: 'bg-transparent text-ark-text-secondary hover:text-ark-text-primary hover:bg-ark-surface',
      danger: 'bg-ark-error text-white hover:bg-red-600',
      accent: 'bg-ark-accent text-ark-bg hover:bg-ark-accent-hover shadow-accent-glow/50',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-input',
      md: 'px-4 py-2 text-sm rounded-input',
      lg: 'px-6 py-3 text-base rounded-card',
      xl: 'px-8 py-4 text-lg rounded-pill font-semibold',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ark-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ark-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
