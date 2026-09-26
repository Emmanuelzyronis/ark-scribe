import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_FOUNDRY_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_FOUNDRY_BASE_URL,
  defaultHeaders: process.env.ANTHROPIC_BASE_URL ? {
    'api-key': process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_FOUNDRY_API_KEY || '',
  } : undefined,
})

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

const SOAP_SYSTEM_PROMPT = `You are an expert medical scribe AI. Generate structured SOAP notes from clinical transcripts.

SOAP Note Format:
- **Subjective**: Patient's chief complaint, history of present illness, symptoms, relevant medical history, medications, allergies, and review of systems as described during the encounter
- **Objective**: Vital signs, physical examination findings, laboratory results, diagnostic test results, and other measurable/observable data
- **Assessment**: Clinical diagnosis or differential diagnoses with reasoning, using proper ICD-10 terminology
- **Plan**: Treatment plan including medications (with dosage/frequency), procedures, referrals, patient education, and follow-up instructions

Guidelines:
1. Use proper clinical terminology and standard medical abbreviations
2. Suggest relevant ICD-10 codes based on the assessment
3. List any medications mentioned with generic names where possible
4. Be thorough but concise — this is a professional medical document
5. If information is missing for a section, note what was not documented (e.g., "Vital signs not documented in encounter")
6. Never fabricate clinical details not present in the transcript
7. PHI has already been redacted from the transcript — work with the available content

Return a JSON object with this exact structure:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "icd10_codes": ["Z00.00", "..."],
  "medications": ["Lisinopril 10mg daily", "..."]
}`

export interface SOAPNoteResult {
  subjective: string
  objective: string
  assessment: string
  plan: string
  icd10_codes: string[]
  medications: string[]
  raw_response: unknown
  generation_ms: number
}

export async function generateSOAPNote(transcript: string, specialty?: string): Promise<SOAPNoteResult> {
  const startTime = Date.now()

  const specialtyContext = specialty
    ? `\n\nPhysician Specialty: ${specialty}. Tailor terminology, common diagnoses, and ICD-10 code suggestions to this specialty.`
    : ''

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SOAP_SYSTEM_PROMPT + specialtyContext,
    messages: [
      {
        role: 'user',
        content: `Please generate a comprehensive SOAP note from the following patient encounter transcript:\n\n${transcript}`,
      },
    ],
  })

  const generation_ms = Date.now() - startTime
  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  let parsed: Omit<SOAPNoteResult, 'raw_response' | 'generation_ms'>
  try {
    // Try to parse the raw response as JSON first
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch {
    // Fallback: structure the raw text
    parsed = {
      subjective: rawText,
      objective: 'See full response',
      assessment: '',
      plan: '',
      icd10_codes: [],
      medications: [],
    }
  }

  return {
    ...parsed,
    icd10_codes: parsed.icd10_codes || [],
    medications: parsed.medications || [],
    raw_response: message,
    generation_ms,
  }
}

export async function rewriteSOAPSection(
  section: string,
  currentText: string,
  instruction: string,
  fullNote?: { subjective?: string; objective?: string; assessment?: string; plan?: string }
): Promise<string> {
  const contextNote = fullNote
    ? `\n\nFull SOAP Note Context:\nS: ${fullNote.subjective || ''}\nO: ${fullNote.objective || ''}\nA: ${fullNote.assessment || ''}\nP: ${fullNote.plan || ''}`
    : ''

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a medical scribe assistant. Rewrite or improve the following ${section.toUpperCase()} section of a SOAP note.

Current ${section} text:
${currentText}

Instruction: ${instruction || 'Improve clarity, completeness, and clinical accuracy'}${contextNote}

Return ONLY the rewritten section text, no explanation or additional formatting.`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : currentText
}

export async function redactPHI(text: string): Promise<{ redacted: string; log: Record<string, number> }> {
  // Basic PHI redaction patterns (in production, use AssemblyAI PII redaction)
  const patterns: Array<{ pattern: RegExp; label: string; replacement: string }> = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: 'SSN', replacement: '[SSN REDACTED]' },
    { pattern: /\bMRN\s*#?\s*\d+\b/gi, label: 'MRN', replacement: '[MRN REDACTED]' },
    { pattern: /\b(?:DOB|date of birth|born on)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, label: 'DOB', replacement: '[DOB REDACTED]' },
    { pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, label: 'Date', replacement: '[DATE REDACTED]' },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, label: 'Phone', replacement: '[PHONE REDACTED]' },
  ]

  let redacted = text
  const log: Record<string, number> = {}

  for (const { pattern, label, replacement } of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      log[label] = (log[label] || 0) + matches.length
      redacted = redacted.replace(pattern, replacement)
    }
  }

  return { redacted, log }
}

export default { generateSOAPNote, rewriteSOAPSection, redactPHI }
