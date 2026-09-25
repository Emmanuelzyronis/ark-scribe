import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '../db/client.js'
import type { DbPhysician } from '../types/index.js'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  specialty: z.string().optional(),
  practice_name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const authenticate = async (request: Parameters<Parameters<FastifyInstance['addHook']>[1]>[0], reply: Parameters<Parameters<FastifyInstance['addHook']>[1]>[1]) => {
  try {
    await (request as unknown as { jwtVerify: () => Promise<void> }).jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body)

      // Check if email already exists
      const existing = await db.query(
        'SELECT id FROM physicians WHERE email = $1',
        [body.email]
      )

      if (existing.rows.length > 0) {
        return reply.code(409).send({ error: 'Email already registered' })
      }

      const password_hash = await bcrypt.hash(body.password, 12)

      const result = await db.query<DbPhysician>(
        `INSERT INTO physicians (email, password_hash, full_name, specialty, practice_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, specialty, practice_name, ehr_preference, custom_vocab_enabled, created_at, updated_at`,
        [body.email, password_hash, body.full_name, body.specialty || null, body.practice_name || null]
      )

      const physician = result.rows[0]
      const token = await reply.jwtSign({ id: physician.id, email: physician.email, full_name: physician.full_name })

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (physician_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, 'register', 'physician', $1, $2::inet, $3)`,
        [physician.id, request.ip || null, request.headers['user-agent'] || null]
      )

      return reply.code(201).send({ token, physician })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      app.log.error(error)
      return reply.code(500).send({ error: 'Registration failed' })
    }
  })

  // POST /api/auth/login
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body)

      const result = await db.query<DbPhysician>(
        'SELECT * FROM physicians WHERE email = $1',
        [body.email]
      )

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const physician = result.rows[0]
      const valid = await bcrypt.compare(body.password, physician.password_hash)

      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const token = await reply.jwtSign({ id: physician.id, email: physician.email, full_name: physician.full_name })

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (physician_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, 'login', 'physician', $1, $2::inet, $3)`,
        [physician.id, request.ip || null, request.headers['user-agent'] || null]
      )

      const { password_hash: _, ...physicianData } = physician
      return reply.send({ token, physician: physicianData })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      app.log.error(error)
      return reply.code(500).send({ error: 'Login failed' })
    }
  })

  // GET /api/auth/me
  app.get('/api/auth/me', { preHandler: [authenticate as never] }, async (request, reply) => {
    try {
      const user = (request as unknown as { user: { id: string } }).user
      const result = await db.query<DbPhysician>(
        'SELECT id, email, full_name, specialty, practice_name, ehr_preference, custom_vocab_enabled, created_at, updated_at FROM physicians WHERE id = $1',
        [user.id]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Physician not found' })
      }

      return reply.send({ physician: result.rows[0] })
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: 'Failed to fetch profile' })
    }
  })

  // PATCH /api/physicians/me
  app.patch('/api/physicians/me', { preHandler: [authenticate as never] }, async (request, reply) => {
    try {
      const user = (request as unknown as { user: { id: string } }).user
      const body = request.body as Record<string, unknown>
      const allowed = ['full_name', 'specialty', 'practice_name', 'ehr_preference', 'custom_vocab_enabled']
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

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No valid fields to update' })
      }

      updates.push(`updated_at = now()`)
      values.push(user.id)

      const result = await db.query<DbPhysician>(
        `UPDATE physicians SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, specialty, practice_name, ehr_preference, custom_vocab_enabled, updated_at`,
        values
      )

      return reply.send({ physician: result.rows[0] })
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: 'Update failed' })
    }
  })
}
