// ArkScribe — Shared TypeScript Types

export interface Physician {
  id: string;
  email: string;
  full_name: string;
  specialty?: string;
  practice_name?: string;
  ehr_preference: 'plain' | 'epic' | 'athena' | 'drchrono';
  custom_vocab_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  physician_id: string;
  expires_at: string;
  created_at: string;
}

export type EncounterStatus = 'recording' | 'processing' | 'draft' | 'finalized';

export interface Encounter {
  id: string;
  physician_id: string;
  title: string;
  patient_ref?: string;
  duration_seconds?: number;
  status: EncounterStatus;
  assemblyai_session_id?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
}

export interface TranscriptWord {
  word: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export interface Transcript {
  id: string;
  encounter_id: string;
  raw_text: string;
  redacted_text?: string;
  words: TranscriptWord[];
  phi_redaction_log?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SOAPNote {
  id: string;
  encounter_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10_codes: string[];
  medications: string[];
  raw_claude_response?: Record<string, unknown>;
  generation_model: string;
  generation_ms?: number;
  created_at: string;
  updated_at: string;
}

export type SOAPSection = 'subjective' | 'objective' | 'assessment' | 'plan';
export type EditSource = 'manual' | 'claude_assist';

export interface NoteEdit {
  id: string;
  soap_note_id: string;
  physician_id: string;
  section: SOAPSection;
  before_text: string;
  after_text: string;
  edit_source: EditSource;
  claude_prompt?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  physician_id: string;
  encounter_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CustomVocabulary {
  id: string;
  physician_id: string;
  term: string;
  phonetic_hint?: string;
  specialty?: string;
  context_hint?: string;
  active: boolean;
  created_at: string;
}

export interface Export {
  id: string;
  physician_id: string;
  encounter_id: string;
  format: string;
  export_hash?: string;
  created_at: string;
}

// API Request/Response types
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  specialty?: string;
  practice_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  physician: Physician;
}

export interface CreateEncounterRequest {
  title?: string;
  patient_ref?: string;
}

export interface GenerateNoteRequest {
  transcript_text: string;
}

export interface RewriteSectionRequest {
  section: SOAPSection;
  current_text: string;
  instruction?: string;
}

export interface ExportNoteRequest {
  format: 'plain' | 'epic' | 'athena' | 'drchrono';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface EncounterWithDetails extends Encounter {
  transcript?: Transcript;
  soap_note?: SOAPNote;
}
