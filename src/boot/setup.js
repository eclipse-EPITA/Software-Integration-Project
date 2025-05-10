const express = require('express')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')

// Load environment-specific .env file
const env = process.env.NODE_ENV || 'dev'
const envFile = `.env.${env}`
const envPath = path.resolve(__dirname, '..', envFile)

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log(`✅ Loaded environment config from ${envFile}`)
} else {
  console.warn(`⚠️ No env file found for ${env} (${envFile})`)
}

const PORT = process.env.PORT || 8080
const app = express()

const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const session = require('express-session')
const morgan = require('morgan')
const logger = require('../middleware/winston')
const notFound = require('../middleware/notFound')
const healthCheck = require('../middleware/healthCheck')
const verifyToken = require('../middleware/authentication')
const validator = require('../middleware/validator')

// ROUTES
const authRoutes = require('../routes/auth.routes')
const messageRoutes = require('../routes/messages.routes')
const usersRoutes = require('../routes/users.routes')
const profileRoutes = require('../routes/profile.routes')
const moviesRoutes = require('../routes/movies.routes')
const ratingRoutes = require('../routes/rating.routes')
const commentsRoutes = require('../routes/comments.routes')

// Connect to MongoDB from env variable
try {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  logger.info('MongoDB Connected')
} catch (error) {
  logger.error('Error connecting to MongoDB: ' + error)
}

// MIDDLEWARE
const registerCoreMiddleWare = () => {
  try {
    app.use(
      session({
        secret: process.env.SESSION_SECRET || '1234',
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: false,
          httpOnly: true,
        },
      })
    )

    app.use(morgan('combined', { stream: logger.stream }))
    app.use(express.json())
    app.use(cors({}))
    app.use(helmet())

    app.use(validator)
    app.use(healthCheck)

    app.use('/auth', authRoutes)
    app.use('/users', usersRoutes)
    app.use('/messages', verifyToken, messageRoutes)
    app.use('/profile', verifyToken, profileRoutes)
    app.use('/movies', verifyToken, moviesRoutes)
    app.use('/ratings', verifyToken, ratingRoutes)
    app.use('/comments', verifyToken, commentsRoutes)

    app.use(notFound)
    logger.http('Done registering all middlewares')
  } catch (err) {
    logger.error('Error in registerCoreMiddleWare: ' + err)
    process.exit(1)
  }
}

// handling uncaught exceptions
const handleError = () => {
  process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT_EXCEPTION: ${JSON.stringify(err.stack)}`)
  })
}

// start application
const startApp = () => {
  try {
    registerCoreMiddleWare()

    app.listen(PORT, () => {
      logger.info('Listening on 127.0.0.1:' + PORT)
    })

    handleError()
  } catch (err) {
    logger.error(
      `startup :: Error while booting the application ${JSON.stringify(err, null, 2)}`
    )
    throw err
  }
}

module.exports = { startApp }
