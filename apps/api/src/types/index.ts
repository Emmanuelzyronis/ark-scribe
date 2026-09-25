import { FastifyRequest } from 'fastify'

export interface JWTPayload {
  id: string
  email: string
  full_name: string
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload
}

export interface DbPhysician {
  id: string
  email: string
  password_hash: string
  full_name: string
  specialty: string | null
  practice_name: string | null
  ehr_preference: string
  custom_vocab_enabled: boolean
  created_at: Date
  updated_at: Date
}

export interface DbEncounter {
  id: string
  physician_id: string
  title: string | null
  patient_ref: string | null
  duration_seconds: number | null
  status: string
  assemblyai_session_id: string | null
  created_at: Date
  updated_at: Date
  finalized_at: Date | null
}

export interface DbTranscript {
  id: string
  encounter_id: string
  raw_text: string | null
  redacted_text: string | null
  words: unknown[]
  phi_redaction_log: unknown | null
  created_at: Date
  updated_at: Date
}

export interface DbSoapNote {
  id: string
  encounter_id: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  icd10_codes: string[]
  medications: string[]
  raw_claude_response: unknown | null
  generation_model: string
  generation_ms: number | null
  created_at: Date
  updated_at: Date
}
