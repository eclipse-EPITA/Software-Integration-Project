import { Pool, types } from 'pg'
import logger from '../../middleware/winston'

// Setup environment-based configuration
const db_config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  max: 10,
}

let db_connection: Pool

function startConnection(): void {
  // Disable automatic Date parsing (e.g., for DATE column type)
  types.setTypeParser(1082, (stringValue) => stringValue)

  db_connection = new Pool(db_config)

  db_connection
    .connect()
    .then(() => {
      logger.info('✅ PostgreSQL Connected')
    })
    .catch((err) => {
      logger.error('❌ PostgreSQL Connection Failed: ' + err.message)
    })

  db_connection.on('error', (err) => {
    logger.error('Unexpected error on idle client: ' + err.message)
    startConnection()
  })
}

startConnection()

export default db_connection
