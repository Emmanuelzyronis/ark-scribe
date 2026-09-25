import Link from 'next/link'
import { Mic, FileText, Zap, Shield, Clock, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ark-bg text-ark-text-primary">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-ark-border/50 bg-ark-bg/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-badge bg-ark-primary flex items-center justify-center">
            <Mic className="w-4 h-4 text-ark-bg" />
          </div>
          <span className="font-bold text-lg text-ark-text-primary">ArkScribe</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ark-text-secondary hover:text-ark-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-input bg-ark-primary text-ark-bg text-sm font-semibold hover:bg-ark-primary-hover transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-ark-surface border border-ark-border text-xs text-ark-text-secondary mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-ark-primary animate-pulse" />
          Built for AI Genesis 2026 — Hackathon Winner Candidate
        </div>

        <h1 className="text-display font-bold text-ark-text-primary mb-6 leading-tight">
          Stop Drowning in<br />
          <span className="text-ark-primary">EHR Documentation</span>
        </h1>

        <p className="text-body-lg text-ark-text-secondary max-w-2xl mx-auto mb-10">
          ArkScribe listens to your patient encounter and generates a perfectly structured SOAP note in seconds —
          so you can spend time with patients, not paperwork.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="px-8 py-4 rounded-pill bg-ark-primary text-ark-bg text-lg font-bold hover:bg-ark-primary-hover shadow-primary-glow transition-all hover:shadow-primary-glow hover:scale-105"
          >
            Start Recording Free
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-pill bg-ark-surface border border-ark-border text-ark-text-primary text-lg font-semibold hover:bg-ark-surface-elevated hover:border-ark-primary transition-all"
          >
            View Demo
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-ark-text-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-ark-primary" />
            No credit card required
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-ark-primary" />
            HIPAA-compliant
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-ark-primary" />
            Under 5 seconds
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-ark-border bg-ark-surface/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '200K+', label: 'Independent physicians in US' },
            { value: '2+ hrs', label: 'Saved per physician per day' },
            { value: '5 sec', label: 'SOAP note generation time' },
            { value: '$79/mo', label: 'vs $300–500 enterprise tools' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-heading-1 font-bold text-ark-primary mb-1">{value}</div>
              <div className="text-sm text-ark-text-secondary">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-heading-1 font-bold text-ark-text-primary mb-4">Everything you need. Nothing you don&apos;t.</h2>
          <p className="text-body-lg text-ark-text-secondary">Purpose-built for independent practice physicians — not hospital systems.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Mic className="w-6 h-6 text-ark-primary" />,
              title: 'Ambient Audio Capture',
              description: 'Browser-based recording — no hardware. Real-time transcription appears word by word as you speak.',
            },
            {
              icon: <Zap className="w-6 h-6 text-ark-primary" />,
              title: 'One-Click SOAP Notes',
              description: 'Claude AI processes your transcript and returns a fully structured SOAP note with ICD-10 codes in under 5 seconds.',
            },
            {
              icon: <FileText className="w-6 h-6 text-ark-primary" />,
              title: 'EHR-Ready Output',
              description: 'Copy in plain text, Epic, Athena, or DrChrono format. Paste directly into your EHR — no reformatting.',
            },
            {
              icon: <Shield className="w-6 h-6 text-ark-primary" />,
              title: 'PHI Redaction',
              description: 'Automatic PHI detection and redaction before any data reaches AI models. Full HIPAA audit log.',
            },
            {
              icon: <CheckCircle className="w-6 h-6 text-ark-primary" />,
              title: 'Inline AI Editing',
              description: 'Click any SOAP section to rewrite or expand with Claude assistance. Accept or reject changes with one click.',
            },
            {
              icon: <Clock className="w-6 h-6 text-ark-primary" />,
              title: 'Note History',
              description: 'Searchable encounter history with status tracking. Bulk export for end-of-day EHR workflow.',
            },
          ].map(({ icon, title, description }) => (
            <div key={title} className="p-6 rounded-card bg-ark-surface border border-ark-border hover:border-ark-primary/40 hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-card bg-ark-primary-muted flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="text-heading-3 text-ark-text-primary mb-2">{title}</h3>
              <p className="text-body-sm text-ark-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-ark-surface/30 border-y border-ark-border">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-heading-1 font-bold text-ark-text-primary mb-4">How it works</h2>
          <p className="text-body-lg text-ark-text-secondary">Three steps. Under a minute.</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Record',
              description: 'Open ArkScribe before your patient encounter. It listens in the background — no button pressing during the visit.',
            },
            {
              step: '02',
              title: 'Generate',
              description: 'Click "Generate Note" after the encounter. Claude reads the full transcript and returns a structured SOAP note.',
            },
            {
              step: '03',
              title: 'Copy & Paste',
              description: 'Review, edit if needed, choose your EHR format, and copy. Done. Your chart is complete.',
            },
          ].map(({ step, title, description }) => (
            <div key={step} className="text-center">
              <div className="text-5xl font-bold text-ark-primary/20 mb-4 font-mono">{step}</div>
              <h3 className="text-heading-3 font-semibold text-ark-text-primary mb-2">{title}</h3>
              <p className="text-body-sm text-ark-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-heading-1 font-bold text-ark-text-primary mb-4">
          Give yourself 2 hours back every day
        </h2>
        <p className="text-body-lg text-ark-text-secondary mb-8">
          Join the waitlist. First 100 physicians get 3 months free.
        </p>
        <Link
          href="/register"
          className="inline-flex px-10 py-4 rounded-pill bg-ark-primary text-ark-bg text-xl font-bold hover:bg-ark-primary-hover shadow-primary-glow transition-all hover:shadow-primary-glow hover:scale-105"
        >
          Start for free
        </Link>
        <p className="mt-4 text-sm text-ark-text-muted">No setup fees · Cancel anytime · HIPAA-compliant</p>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-ark-border text-center text-sm text-ark-text-muted">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-badge bg-ark-primary flex items-center justify-center">
            <Mic className="w-3 h-3 text-ark-bg" />
          </div>
          <span className="font-semibold text-ark-text-secondary">ArkScribe</span>
        </div>
        <p>Built for AI Genesis 2026 · Powered by Claude + AssemblyAI</p>
        <p className="mt-1">© 2026 ArkScribe. HIPAA-compliant AI medical documentation.</p>
      </footer>
    </div>
  )
}
