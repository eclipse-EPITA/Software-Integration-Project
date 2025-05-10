const { Pool } = require('pg')
const logger = require('../middleware/winston')

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
})

pool
  .connect()
  .then(() => logger.info('✅ PostgreSQL connected'))
  .catch((err) => logger.error('❌ PostgreSQL connection error: ' + err))

module.exports = pool
