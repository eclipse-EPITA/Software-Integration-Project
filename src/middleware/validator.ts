import { Request, Response, NextFunction } from 'express';
import logger from './winston';
import { statusCodes } from '../constants/statusCodes';
import { ValidationError } from '../types/error';

interface RequestBody {
  [key: string]: unknown;
  creation_date?: string;
}

interface CustomRequest extends Request {
  body: RequestBody;
}

const validator = (req: CustomRequest, res: Response, next: NextFunction): void => {
  const body = req.body;

  if (body.creation_date) {
    delete body.creation_date;
  }

  const creationDate = new Date().toJSON().slice(0, 10);
  body.creation_date = creationDate;

  try {
    for (const [key, value] of Object.entries(body)) {
      if (value === '') {
        body[key] = null;
      }
    }

    next();
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.badRequest).json({ 
      error: 'Invalid request data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const validateSignup = (req: Request): ValidationError[] => {
  const errors: ValidationError[] = [];
  const { username, email, password } = req.body;

  if (!username) {
    errors.push({ message: 'Username is required', field: 'username' });
  }
  if (!email) {
    errors.push({ message: 'Email is required', field: 'email' });
  }
  if (!password) {
    errors.push({ message: 'Password is required', field: 'password' });
  }

  return errors;
};

export const validateSignin = (req: Request): ValidationError[] => {
  const errors: ValidationError[] = [];
  const { email, password } = req.body;

  if (!email) {
    errors.push({ message: 'Email is required', field: 'email' });
  }
  if (!password) {
    errors.push({ message: 'Password is required', field: 'password' });
  }

  return errors;
};

export const validate = (validatorFn: (req: Request) => ValidationError[]): ((req: Request, res: Response, next: NextFunction) => void | Response) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const errors = validatorFn(req);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  };
};

export default validator; 