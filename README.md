# ArkScribe

**Ambient AI medical scribe for independent practice physicians — SOAP notes in one click**

> Built for **AI Genesis 2026** | lablab.ai hackathon | Dubai, UAE

---

## Demo

> Interactive terminal demo — [view the full case study](https://emmanuelzyronis.vercel.app/work/ark-scribe)

```text
$ curl -s -X POST http://localhost:3001/api/note/generate \
  -d '{"transcript":"Patient: 3-day productive cough, fever 38.4C, right chest pain.","specialty":"general-practice"}' | jq .note

Generating SOAP note ...

{
  "subjective": "Patient presenting with 3-day productive cough, fever (38.4°C), and right-sided pleuritic chest discomfort.",
  "objective": "Vitals: Temp 38.4°C, HR 92, SpO2 97% RA. Decreased breath sounds right lower lobe.",
  "assessment": "Community-acquired pneumonia, right lower lobe (J18.1).",
  "plan": "1. Amoxicillin-clavulanate 875/125mg BID x 5d\n2. CXR right lateral\n3. Follow-up 48h",
  "icd10": ["J18.1", "R05.9", "R50.9"],
  "generated_in_ms": 2847
}
```

---

## The Problem

200,000+ independent practice physicians in the US spend **2+ hours per day** on EHR documentation — equivalent to seeing 4 additional patients. Physician burnout sits at 53% globally, with documentation cited as the top driver. Nuance DAX and Abridge cost $300–500/month and are sold exclusively through enterprise hospital contracts, leaving solo and small-group practices with no accessible AI documentation tool.

## The Solution

ArkScribe listens to your patient encounter as ambient audio and generates a perfectly structured SOAP note in under 5 seconds — powered by Claude AI and AssemblyAI real-time transcription.

**Market Value:** $1.94B AI medical scribe software market (2026), growing at 26.9% CAGR to $5.08B by 2030.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Fastify v5 + TypeScript (Node.js) |
| **Frontend** | Next.js 15 App Router + React 19 + Tailwind CSS |
| **Database** | Neon Postgres (serverless, encrypted) |
| **AI — SOAP Notes** | Claude (claude-sonnet-4-6) via Anthropic/Azure |
| **AI — Transcription** | AssemblyAI real-time streaming at $0.006/min |
| **Auth** | JWT (bcrypt hashed passwords, HIPAA-compliant) |
| **Monorepo** | Turborepo with npm workspaces |

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- A Neon Postgres database
- Anthropic API key (or Azure Cognitive Services endpoint)
- AssemblyAI API key (optional for MVP)

### Install

```bash
git clone https://github.com/Emmanuelzyronis/ark-scribe
cd ark-scribe
npm install --legacy-peer-deps
```

### Configure environment

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY

# Frontend
cp apps/web/.env.local.example apps/web/.env.local
# Edit NEXT_PUBLIC_API_URL if not using localhost:3001
```

### Initialize database

```bash
cd apps/api
npm run db:init
```

### Run development

```bash
# Terminal 1: API (port 3001)
cd apps/api
npx tsx src/index.ts

# Terminal 2: Web (port 3000)
cd apps/web
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) |
| `JWT_EXPIRY` | Token expiry (default: `7d`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `ANTHROPIC_BASE_URL` | Azure Foundry base URL (optional) |
| `CLAUDE_MODEL` | Model ID (default: `claude-sonnet-4-6`) |
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for transcription |
| `PORT` | API port (default: `3001`) |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:3001`) |

---

## Core Features

1. **Browser ambient audio capture** — MediaStream API with real-time waveform visualization
2. **One-click SOAP generation** — Claude reads the transcript and returns structured S/O/A/P in under 5 seconds
3. **Side-by-side review** — Transcript on the left, SOAP note on the right with word-level alignment
4. **Inline Claude editing** — Click any SOAP section to rewrite or expand with AI assistance
5. **Note history dashboard** — Searchable encounter list with status badges and one-click EHR copy
6. **PHI redaction** — Automatic PHI detection before transcripts reach AI models
7. **HIPAA audit log** — Every note access logged with physician identity and timestamp
8. **EHR-ready export** — Plain text, Epic, Athena Health, DrChrono formats
9. **Custom vocabulary** — Upload specialty-specific terminology for better transcription
10. **Multi-format copy** — Format selector dropdown with instant clipboard copy

---

## Hackathon

**AI Genesis 2026** | lablab.ai | /function1 Conference, Dubai  
Prize pool: $60,000+ | Anthropic credit rewards for Claude-native builds

**Why ArkScribe wins:**
- Live demo moment: record 3-minute mock encounter → press one button → read perfect SOAP note
- AssemblyAI at $0.006/min means the entire demo costs under $0.02
- Healthcare impact: physicians save 2 hours/day — globally scalable
- Claude's Constitutional AI reduces hallucination risk — a clinically-critical differentiator
- The $60K+ prize pool specifically rewards Claude-native builds

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagram, DB schema, and API table.

---

## License

MIT © 2026 Emmanuel Zyronis / ArkScribe
