'use client'

export const dynamic = 'force-dynamic'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SPECIALTIES = [
  'Family Medicine', 'Internal Medicine', 'Pediatrics', 'Cardiology',
  'Dermatology', 'Orthopedics', 'Psychiatry', 'Neurology', 'OB/GYN',
  'Ophthalmology', 'ENT', 'Urology', 'Oncology', 'Emergency Medicine', 'Other'
]

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading, error } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    specialty: '',
    practice_name: '',
  })
  const [formError, setFormError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    const ok = await register(form)
    if (ok) {
      router.push('/dashboard')
    } else {
      setFormError(error || 'Registration failed')
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen bg-ark-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-badge bg-ark-primary flex items-center justify-center">
              <Mic className="w-5 h-5 text-ark-bg" />
            </div>
            <span className="font-bold text-xl text-ark-text-primary">ArkScribe</span>
          </Link>
          <h1 className="text-heading-2 font-bold text-ark-text-primary">Create your account</h1>
          <p className="text-body-sm text-ark-text-secondary mt-1">Start generating SOAP notes today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && (
            <div className="p-3 rounded-input bg-ark-error-muted border border-red-800 text-sm text-ark-error">
              {formError || error}
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Dr. Jane Smith"
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@practice.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="Min. 8 characters"
            required
            autoComplete="new-password"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ark-text-secondary mb-1.5">
              Specialty
            </label>
            <select
              value={form.specialty}
              onChange={e => set('specialty', e.target.value)}
              className="w-full px-4 py-2.5 rounded-input text-sm bg-ark-surface border border-ark-border text-ark-text-primary focus:outline-none focus:border-ark-primary focus:ring-1 focus:ring-ark-primary transition-colors"
            >
              <option value="">Select specialty...</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Input
            label="Practice Name (optional)"
            type="text"
            value={form.practice_name}
            onChange={e => set('practice_name', e.target.value)}
            placeholder="Your Practice Name"
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-ark-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-ark-primary hover:text-ark-accent font-medium">
            Sign in
          </Link>
        </p>

        <p className="text-center mt-4 text-xs text-ark-text-disabled">
          By registering, you agree to our terms. HIPAA-compliant by design.
        </p>
      </div>
    </div>
  )
}
