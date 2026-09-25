-- ArkScribe Database Schema
-- Run once to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Physicians table
CREATE TABLE IF NOT EXISTS physicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  specialty TEXT,
  practice_name TEXT,
  ehr_preference TEXT DEFAULT 'plain' CHECK (ehr_preference IN ('plain', 'epic', 'athena', 'drchrono')),
  custom_vocab_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  access_token_hash TEXT,
  refresh_token_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Encounters table
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  title TEXT,
  patient_ref TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'draft', 'finalized')),
  assemblyai_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE UNIQUE,
  raw_text TEXT,
  redacted_text TEXT,
  words JSONB DEFAULT '[]',
  phi_redaction_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SOAP Notes table
CREATE TABLE IF NOT EXISTS soap_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE UNIQUE,
  subjective TEXT DEFAULT '',
  objective TEXT DEFAULT '',
  assessment TEXT DEFAULT '',
  plan TEXT DEFAULT '',
  icd10_codes TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  raw_claude_response JSONB,
  generation_model TEXT DEFAULT 'claude-sonnet-4-6',
  generation_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note Edits table (HIPAA audit trail for note modifications)
CREATE TABLE IF NOT EXISTS note_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  soap_note_id UUID NOT NULL REFERENCES soap_notes(id) ON DELETE CASCADE,
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('subjective', 'objective', 'assessment', 'plan')),
  before_text TEXT,
  after_text TEXT,
  edit_source TEXT CHECK (edit_source IN ('manual', 'claude_assist')),
  claude_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs table (HIPAA compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom Vocabulary table
CREATE TABLE IF NOT EXISTS custom_vocabulary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  phonetic_hint TEXT,
  specialty TEXT,
  context_hint TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  export_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_encounters_physician ON encounters(physician_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounters_created ON encounters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_encounter ON transcripts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_encounter ON soap_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_physician ON audit_logs(physician_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_vocab_physician ON custom_vocabulary(physician_id);
CREATE INDEX IF NOT EXISTS idx_note_edits_soap_note ON note_edits(soap_note_id);
