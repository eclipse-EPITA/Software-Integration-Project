import { Pool } from 'pg'
import logger from '../middleware/winston'

// Create PostgreSQL connection pool using env variables
const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
})

pool
  .connect()
  .then(() => logger.info('✅ PostgreSQL connected'))
  .catch((err: Error) => logger.error('❌ PostgreSQL connection error: ' + err.message))

export default pool
