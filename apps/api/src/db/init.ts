#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

async function initDatabase() {
  console.log('Initializing ArkScribe database...')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    // Run the entire schema as one query
    await pool.query(schema)
    console.log('Database schema initialized successfully!')

    // Verify tables
    const result = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `)
    console.log('Tables created:', result.rows.map((r: { tablename: string }) => r.tablename).join(', '))

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Database initialization failed:', error)
    await pool.end()
    process.exit(1)
  }
}

initDatabase()
