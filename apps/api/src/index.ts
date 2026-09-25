import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authRoutes from './routes/auth.js'
import encounterRoutes from './routes/encounters.js'
import vocabularyRoutes from './routes/vocabulary.js'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
})

// Plugins
await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://ark-scribe.vercel.app',
    process.env.FRONTEND_URL || '*',
  ],
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'ark-scribe-dev-secret-change-in-production',
  sign: { expiresIn: process.env.JWT_EXPIRY || '7d' },
})

// Routes
await app.register(authRoutes)
await app.register(encounterRoutes)
await app.register(vocabularyRoutes)

// Webhook: AssemblyAI partial transcript streaming
app.post('/api/webhooks/assemblyai', async (request, reply) => {
  // In production: verify AssemblyAI signature header
  const body = request.body as Record<string, unknown>
  app.log.info({ body }, 'AssemblyAI webhook received')
  return reply.send({ received: true })
})

// Root health
app.get('/', async (_request, reply) => {
  return reply.send({ service: 'ArkScribe API', version: '0.1.0', status: 'running' })
})

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

try {
  await app.listen({ port: PORT, host: HOST })
  console.log(`ArkScribe API running on http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
