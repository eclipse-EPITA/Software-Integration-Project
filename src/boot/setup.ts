import express, { Application } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import session from 'express-session';
import morgan from 'morgan';
import logger, { stream as loggerStream } from '../middleware/winston';
import notFound from '../middleware/notFound';
import healthCheck from '../middleware/healthCheck';
import verifyToken from '../middleware/authentication';
import validator from '../middleware/validator';

// ROUTES
import authRoutes from '../routes/auth.routes';
import messageRoutes from '../routes/messages.routes';
import usersRoutes from '../routes/users.routes';
import profileRoutes from '../routes/profile.routes';
import moviesRoutes from '../routes/movies.routes';
import ratingRoutes from '../routes/rating.routes';
import commentsRoutes from '../routes/comments.routes';

const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || 'default_secret';

const app: Application = express();
const ENV = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${ENV}`) });

try {
  mongoose.connect(MONGO_URI as string);
  logger.info(`MongoDB Connected to ${MONGO_URI}`);
} catch (error) {
  logger.error('Error connecting to DB: ' + error);
}

// MIDDLEWARE
const registerCoreMiddleWare = (): void => {
  try {
    // using our session
    app.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: false,
          httpOnly: true,
        },
      }),
    );

    app.use(morgan('combined', { stream: loggerStream }));
    app.use(express.json()); // returning middleware that only parses Json
    app.use(cors({})); // enabling CORS
    app.use(helmet()); // enabling helmet -> setting response headers

    app.use(validator);
    app.use(healthCheck);

    app.use('/auth', authRoutes);
    app.use('/users', usersRoutes);

    // Route registration
    app.use('/messages', verifyToken, messageRoutes);
    app.use('/profile', verifyToken, profileRoutes);
    app.use('/movies', verifyToken, moviesRoutes);
    app.use('/ratings', verifyToken, ratingRoutes);
    app.use('/comments', verifyToken, commentsRoutes);

    // 404 handling for not found
    app.use(notFound);

    logger.http('Done registering all middlewares');
  } catch (_err) {
    logger.error('Error thrown while executing registerCoreMiddleWare');
    process.exit(1);
  }
};

// handling uncaught exceptions
const handleError = (): void => {
  // 'process' is a built it object in nodejs
  // if uncaught exceptoin, then we execute this
  process.on('uncaughtException', (_err: Error) => {
    logger.error(`UNCAUGHT_EXCEPTION OCCURED : ${JSON.stringify(_err.stack)}`);
  });
};

// start applicatoin
const startApp = (): void => {
  try {
    // register core application level middleware
    registerCoreMiddleWare();

    app.listen(PORT, () => {
      logger.info('Listening on 127.0.0.1:' + PORT);
    });

    // exit on uncaught exception
    handleError();
  } catch (_err) {
    logger.error(
      `startup :: Error while booting the applicaiton ${JSON.stringify(
        _err,
        undefined,
        2,
      )}`,
    );
    throw _err;
  }
};

export { startApp }; 