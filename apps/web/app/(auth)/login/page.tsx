'use client'

export const dynamic = 'force-dynamic'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = await login(email, password)
    if (ok) {
      router.push('/dashboard')
    } else {
      setFormError(error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-ark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-badge bg-ark-primary flex items-center justify-center">
              <Mic className="w-5 h-5 text-ark-bg" />
            </div>
            <span className="font-bold text-xl text-ark-text-primary">ArkScribe</span>
          </Link>
          <h1 className="text-heading-2 font-bold text-ark-text-primary">Welcome back</h1>
          <p className="text-body-sm text-ark-text-secondary mt-1">Sign in to your physician account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && (
            <div className="p-3 rounded-input bg-ark-error-muted border border-red-800 text-sm text-ark-error">
              {formError || error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@practice.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-ark-text-secondary">
          New to ArkScribe?{' '}
          <Link href="/register" className="text-ark-primary hover:text-ark-accent font-medium">
            Create account
          </Link>
        </p>

        <p className="text-center mt-4 text-xs text-ark-text-disabled">
          HIPAA-compliant. We never share your patient data.
        </p>
      </div>
    </div>
  )
}
