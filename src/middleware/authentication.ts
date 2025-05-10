import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { statusCodes } from '../constants/statusCodes';
import logger from './winston';

interface CustomRequest extends Request {
  user?: {
    id?: string;
    email: string;
  };
}

interface DecodedToken {
  user: {
    id: string;
    email: string;
  };
  iat: number;
  exp: number;
}

export const verifyToken = (req: CustomRequest, res: Response, next: NextFunction): void => {
  const bearerHeader = req.header('Authorization');

  if (!bearerHeader) {
    res.status(statusCodes.unauthorized).json({ error: 'Unauthorized' });
    return;
  }

  const bearer = bearerHeader.split(' ');
  if (bearer.length !== 2 || bearer[0] !== 'Bearer') {
    res.status(statusCodes.unauthorized).json({ error: 'Invalid token format' });
    return;
  }

  const token = bearer[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || '') as DecodedToken;
    
    if (!decoded.user || !decoded.user.email) {
      res.status(statusCodes.unauthorized).json({ error: 'Invalid token payload' });
      return;
    }

    req.user = {
      id: decoded.user.id,
      email: decoded.user.email,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(statusCodes.unauthorized).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(statusCodes.unauthorized).json({ error: 'Invalid token' });
    } else {
      logger.error(error instanceof Error ? error.stack : 'Unknown error');
      res.status(statusCodes.unauthorized).json({ error: 'Authentication failed' });
    }
  }
};

export default verifyToken