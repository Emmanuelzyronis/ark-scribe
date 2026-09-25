import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import db from '../db/client.js'
import { authenticate } from './auth.js'
import { generateSOAPNote, rewriteSOAPSection, redactPHI } from '../services/ai.service.js'
import type { DbEncounter, DbTranscript, DbSoapNote } from '../types/index.js'

interface AuthUser { id: string; email: string; full_name: string }
type AuthRequest = { user: AuthUser } & Parameters<Parameters<FastifyInstance['get']>[1]>[0]

const createEncounterSchema = z.object({
  title: z.string().optional(),
  patient_ref: z.string().optional(),
})

const updateTranscriptSchema = z.object({
  raw_text: z.string(),
  words: z.array(z.object({
    word: z.string(),
    start_ms: z.number(),
    end_ms: z.number(),
    confidence: z.number().optional(),
  })).optional(),
})

const generateNoteSchema = z.object({
  transcript_text: z.string().min(10),
})

const rewriteSectionSchema = z.object({
  section: z.enum(['subjective', 'objective', 'assessment', 'plan']),
  current_text: z.string(),
  instruction: z.string().optional(),
})

const exportNoteSchema = z.object({
  format: z.enum(['plain', 'epic', 'athena', 'drchrono']).default('plain'),
})

function formatNoteForEHR(note: DbSoapNote, format: string, title?: string): string {
  const header = title ? `ENCOUNTER: ${title}\n${'='.repeat(50)}\n\n` : ''

  if (format === 'plain') {
    return `${header}SUBJECTIVE:\n${note.subjective}\n\nOBJECTIVE:\n${note.objective}\n\nASSESSMENT:\n${note.assessment}\n\nPLAN:\n${note.plan}`
  }

  if (format === 'epic') {
    return `${header}[SUBJECTIVE]\n${note.subjective}\n\n[OBJECTIVE]\n${note.objective}\n\n[ASSESSMENT]\n${note.assessment}\n\n[PLAN]\n${note.plan}`
  }

  if (format === 'athena') {
    return `${header}Subjective: ${note.subjective}\n\nObjective: ${note.objective}\n\nAssessment: ${note.assessment}\n\nPlan: ${note.plan}`
  }

  if (format === 'drchrono') {
    return `${header}S - ${note.subjective}\n\nO - ${note.objective}\n\nA - ${note.assessment}\n\nP - ${note.plan}`
  }

  return `${header}${note.subjective}\n${note.objective}\n${note.assessment}\n${note.plan}`
}

export default async function encounterRoutes(app: FastifyInstance) {
  // GET /api/encounters — List all encounters
  app.get('/api/encounters', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { page = 1, limit = 20, status, search } = request.query as {
      page?: number; limit?: number; status?: string; search?: string
    }

    const offset = (Number(page) - 1) * Number(limit)
    let whereClause = 'WHERE physician_id = $1'
    const params: unknown[] = [user.id]
    let paramIdx = 2

    if (status) {
      whereClause += ` AND status = $${paramIdx++}`
      params.push(status)
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIdx} OR patient_ref ILIKE $${paramIdx})`
      params.push(`%${search}%`)
      paramIdx++
    }

    const [encounters, count] = await Promise.all([
      db.query<DbEncounter>(
        `SELECT * FROM encounters ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, Number(limit), offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM encounters ${whereClause}`,
        params
      ),
    ])

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (physician_id, action, resource_type, ip_address) VALUES ($1, 'list', 'encounter', $2::inet)`,
      [user.id, request.ip || null]
    )

    return reply.send({
      data: encounters.rows,
      total: parseInt(count.rows[0].count),
      page: Number(page),
      per_page: Number(limit),
      has_more: offset + encounters.rows.length < parseInt(count.rows[0].count),
    })
  })

  // POST /api/encounters — Create encounter
  app.post('/api/encounters', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const body = createEncounterSchema.parse(request.body)

    const result = await db.query<DbEncounter>(
      `INSERT INTO encounters (physician_id, title, patient_ref, status) VALUES ($1, $2, $3, 'recording') RETURNING *`,
      [user.id, body.title || `Encounter ${new Date().toLocaleDateString()}`, body.patient_ref || null]
    )

    const encounter = result.rows[0]

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address) VALUES ($1, $2, 'create', 'encounter', $2, $3::inet)`,
      [user.id, encounter.id, request.ip || null]
    )

    return reply.code(201).send({ encounter, assemblyai_token: process.env.ASSEMBLYAI_API_KEY || 'configure-assemblyai' })
  })

  // GET /api/encounters/:id
  app.get('/api/encounters/:id', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }

    const [encounterRes, transcriptRes, noteRes] = await Promise.all([
      db.query<DbEncounter>('SELECT * FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id]),
      db.query<DbTranscript>('SELECT * FROM transcripts WHERE encounter_id = $1', [id]),
      db.query<DbSoapNote>('SELECT * FROM soap_notes WHERE encounter_id = $1', [id]),
    ])

    if (encounterRes.rows.length === 0) {
      return reply.code(404).send({ error: 'Encounter not found' })
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address, user_agent) VALUES ($1, $2, 'view', 'encounter', $2, $3::inet, $4)`,
      [user.id, id, request.ip || null, request.headers['user-agent'] || null]
    )

    return reply.send({
      encounter: encounterRes.rows[0],
      transcript: transcriptRes.rows[0] || null,
      soap_note: noteRes.rows[0] || null,
    })
  })

  // PATCH /api/encounters/:id
  app.patch('/api/encounters/:id', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown>

    const existing = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (existing.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    const allowed = ['title', 'patient_ref', 'status', 'duration_seconds']
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = $${idx}`)
        values.push(body[key])
        idx++
      }
    }

    if (body.status === 'finalized') {
      updates.push(`finalized_at = now()`)
    }

    updates.push(`updated_at = now()`)
    values.push(id)

    const result = await db.query<DbEncounter>(
      `UPDATE encounters SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address) VALUES ($1, $2, 'update', 'encounter', $2, $3::inet)`,
      [user.id, id, request.ip || null]
    )

    return reply.send({ encounter: result.rows[0] })
  })

  // DELETE /api/encounters/:id (soft delete)
  app.delete('/api/encounters/:id', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }

    const existing = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (existing.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    await db.query('UPDATE encounters SET status = $1, updated_at = now() WHERE id = $2', ['processing', id])

    await db.query(
      `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address) VALUES ($1, $2, 'delete', 'encounter', $2, $3::inet)`,
      [user.id, id, request.ip || null]
    )

    return reply.code(204).send()
  })

  // POST /api/encounters/:id/transcript/finalize — Finalize transcript with PHI redaction
  app.post('/api/encounters/:id/transcript/finalize', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = updateTranscriptSchema.parse(request.body)

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    // Redact PHI
    const { redacted, log } = await redactPHI(body.raw_text)

    // Upsert transcript
    const result = await db.query<DbTranscript>(
      `INSERT INTO transcripts (encounter_id, raw_text, redacted_text, words, phi_redaction_log)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (encounter_id) DO UPDATE
       SET raw_text = $2, redacted_text = $3, words = $4, phi_redaction_log = $5, updated_at = now()
       RETURNING *`,
      [id, body.raw_text, redacted, JSON.stringify(body.words || []), JSON.stringify(log)]
    )

    // Update encounter status
    await db.query('UPDATE encounters SET status = $1, updated_at = now() WHERE id = $2', ['processing', id])

    return reply.send({ transcript: result.rows[0], redaction_summary: log })
  })

  // GET /api/encounters/:id/transcript
  app.get('/api/encounters/:id/transcript', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    const result = await db.query<DbTranscript>('SELECT * FROM transcripts WHERE encounter_id = $1', [id])
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Transcript not found' })

    return reply.send({ transcript: result.rows[0] })
  })

  // POST /api/encounters/:id/note/generate — Generate SOAP note
  app.post('/api/encounters/:id/note/generate', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = generateNoteSchema.parse(request.body)

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    try {
      const soapResult = await generateSOAPNote(body.transcript_text)

      const result = await db.query<DbSoapNote>(
        `INSERT INTO soap_notes (encounter_id, subjective, objective, assessment, plan, icd10_codes, medications, raw_claude_response, generation_model, generation_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (encounter_id) DO UPDATE
         SET subjective = $2, objective = $3, assessment = $4, plan = $5, icd10_codes = $6, medications = $7, raw_claude_response = $8, generation_model = $9, generation_ms = $10, updated_at = now()
         RETURNING *`,
        [id, soapResult.subjective, soapResult.objective, soapResult.assessment, soapResult.plan,
         soapResult.icd10_codes, soapResult.medications, JSON.stringify(soapResult.raw_response),
         process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', soapResult.generation_ms]
      )

      // Update encounter status to draft
      await db.query('UPDATE encounters SET status = $1, updated_at = now() WHERE id = $2', ['draft', id])

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address) VALUES ($1, $2, 'generate_note', 'soap_note', $2, $3::inet)`,
        [user.id, id, request.ip || null]
      )

      return reply.send({ soap_note: result.rows[0], generation_ms: soapResult.generation_ms })
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: 'Note generation failed', details: (error as Error).message })
    }
  })

  // GET /api/encounters/:id/note
  app.get('/api/encounters/:id/note', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    const result = await db.query<DbSoapNote>('SELECT * FROM soap_notes WHERE encounter_id = $1', [id])
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Note not found' })

    return reply.send({ soap_note: result.rows[0] })
  })

  // PATCH /api/encounters/:id/note — Manual note update
  app.patch('/api/encounters/:id/note', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, string>

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    const noteRes = await db.query<DbSoapNote>('SELECT * FROM soap_notes WHERE encounter_id = $1', [id])
    if (noteRes.rows.length === 0) return reply.code(404).send({ error: 'Note not found' })

    const oldNote = noteRes.rows[0]
    const allowed = ['subjective', 'objective', 'assessment', 'plan']
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = $${idx}`)
        values.push(body[key])
        // Record edit
        await db.query(
          `INSERT INTO note_edits (soap_note_id, physician_id, section, before_text, after_text, edit_source)
           VALUES ($1, $2, $3, $4, $5, 'manual')`,
          [oldNote.id, user.id, key, oldNote[key as keyof DbSoapNote] || '', body[key]]
        )
        idx++
      }
    }

    if (updates.length === 0) return reply.code(400).send({ error: 'No valid fields' })

    updates.push(`updated_at = now()`)
    values.push(oldNote.id)

    const result = await db.query<DbSoapNote>(
      `UPDATE soap_notes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    return reply.send({ soap_note: result.rows[0] })
  })

  // POST /api/encounters/:id/note/section/rewrite — Claude-assisted section rewrite
  app.post('/api/encounters/:id/note/section/rewrite', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = rewriteSectionSchema.parse(request.body)

    const enc = await db.query('SELECT id FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id])
    if (enc.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })

    const noteRes = await db.query<DbSoapNote>('SELECT * FROM soap_notes WHERE encounter_id = $1', [id])
    if (noteRes.rows.length === 0) return reply.code(404).send({ error: 'Note not found' })

    const oldNote = noteRes.rows[0]

    const rewritten = await rewriteSOAPSection(
      body.section,
      body.current_text,
      body.instruction || 'Improve clarity and completeness',
      { subjective: oldNote.subjective, objective: oldNote.objective, assessment: oldNote.assessment, plan: oldNote.plan }
    )

    // Update the section
    const result = await db.query<DbSoapNote>(
      `UPDATE soap_notes SET ${body.section} = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [rewritten, oldNote.id]
    )

    // Record edit
    await db.query(
      `INSERT INTO note_edits (soap_note_id, physician_id, section, before_text, after_text, edit_source, claude_prompt)
       VALUES ($1, $2, $3, $4, $5, 'claude_assist', $6)`,
      [oldNote.id, user.id, body.section, body.current_text, rewritten, body.instruction || null]
    )

    return reply.send({ soap_note: result.rows[0], rewritten_text: rewritten })
  })

  // POST /api/encounters/:id/note/export — Export note in EHR format
  app.post('/api/encounters/:id/note/export', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }
    const body = exportNoteSchema.parse(request.body)

    const [encRes, noteRes] = await Promise.all([
      db.query<DbEncounter>('SELECT * FROM encounters WHERE id = $1 AND physician_id = $2', [id, user.id]),
      db.query<DbSoapNote>('SELECT * FROM soap_notes WHERE encounter_id = $1', [id]),
    ])

    if (encRes.rows.length === 0) return reply.code(404).send({ error: 'Encounter not found' })
    if (noteRes.rows.length === 0) return reply.code(404).send({ error: 'Note not found' })

    const formatted = formatNoteForEHR(noteRes.rows[0], body.format, encRes.rows[0].title || undefined)

    // Record export
    await db.query(
      `INSERT INTO exports (physician_id, encounter_id, format) VALUES ($1, $2, $3)`,
      [user.id, id, body.format]
    )

    await db.query(
      `INSERT INTO audit_logs (physician_id, encounter_id, action, resource_type, resource_id, ip_address) VALUES ($1, $2, 'export', 'soap_note', $2, $3::inet)`,
      [user.id, id, request.ip || null]
    )

    return reply.send({ formatted_note: formatted, format: body.format })
  })

  // GET /api/audit — HIPAA audit log
  app.get('/api/audit', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number }
    const offset = (Number(page) - 1) * Number(limit)

    const result = await db.query(
      'SELECT * FROM audit_logs WHERE physician_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [user.id, Number(limit), offset]
    )

    const count = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM audit_logs WHERE physician_id = $1',
      [user.id]
    )

    return reply.send({ data: result.rows, total: parseInt(count.rows[0].count), page: Number(page) })
  })

  // GET /api/health
  app.get('/api/health', async (_request, reply) => {
    try {
      await db.query('SELECT 1')
      return reply.send({ status: 'ok', service: 'ark-scribe-api', db: 'connected' })
    } catch {
      return reply.code(503).send({ status: 'error', service: 'ark-scribe-api', db: 'disconnected' })
    }
  })
}
