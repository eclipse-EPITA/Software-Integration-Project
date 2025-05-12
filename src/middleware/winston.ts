import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Create a simple logger with basic configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Add console transport in non-production environment
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

export const stream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};

export const logRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
};

export const logError = (err: Error): void => {
  // For Error objects, manually extract message and stack to ensure they're logged
  if (err instanceof Error) {
    logger.error({
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.error(err);
  }
};

export default logger;