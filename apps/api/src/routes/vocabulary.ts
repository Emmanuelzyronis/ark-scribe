import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import db from '../db/client.js'
import { authenticate } from './auth.js'

interface AuthUser { id: string }
type AuthRequest = { user: AuthUser } & Parameters<Parameters<FastifyInstance['get']>[1]>[0]

const createVocabSchema = z.object({
  term: z.string().min(1),
  phonetic_hint: z.string().optional(),
  specialty: z.string().optional(),
  context_hint: z.string().optional(),
})

export default async function vocabularyRoutes(app: FastifyInstance) {
  app.get('/api/vocabulary', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const result = await db.query(
      'SELECT * FROM custom_vocabulary WHERE physician_id = $1 AND active = true ORDER BY created_at DESC',
      [user.id]
    )
    return reply.send({ data: result.rows })
  })

  app.post('/api/vocabulary', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const body = createVocabSchema.parse(request.body)

    const result = await db.query(
      `INSERT INTO custom_vocabulary (physician_id, term, phonetic_hint, specialty, context_hint)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, body.term, body.phonetic_hint || null, body.specialty || null, body.context_hint || null]
    )

    return reply.code(201).send({ vocabulary: result.rows[0] })
  })

  app.delete('/api/vocabulary/:id', { preHandler: [authenticate as never] }, async (request, reply) => {
    const user = (request as unknown as AuthRequest).user
    const { id } = request.params as { id: string }

    await db.query(
      'UPDATE custom_vocabulary SET active = false WHERE id = $1 AND physician_id = $2',
      [id, user.id]
    )

    return reply.code(204).send()
  })
}
