import { Pool } from '@neondatabase/serverless'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  pool,
}

export default db
