'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-ark-bg flex items-center justify-center text-center px-4">
      <div>
        <h1 className="text-heading-1 font-bold text-ark-error mb-4">Something went wrong</h1>
        <p className="text-body-sm text-ark-text-secondary mb-6">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-input bg-ark-primary text-ark-bg font-medium hover:bg-ark-primary-hover transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
