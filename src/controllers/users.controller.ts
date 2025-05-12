import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import * as jwt from 'jsonwebtoken';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import pool from '../boot/database/db_connect';
import { Session } from 'express-session';

interface UserRequestBody {
  email: string;
  username: string;
  password: string;
  country: string;
  city?: string;
  street?: string;
  creation_date?: Date;
}

interface UserSession extends Session {
  user?: {
    email: string;
  };
}

interface CustomRequest extends Request {
  session: UserSession;
  body: UserRequestBody;
}

export const register = async (req: CustomRequest, res: Response): Promise<void> => {
  const { email, username, password, country, city, street } = req.body;

  if (!email || !username || !password || !country) {
    res.status(statusCodes.badRequest).json({ message: 'Missing parameters' });
    return;
  }

  const client: PoolClient = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1;',
      [email],
    );
    if (result.rowCount) {
      res
        .status(statusCodes.userAlreadyExists)
        .json({ message: 'User already has an account' });
      return;
    }

    await client.query('BEGIN');
    const addedUser = await client.query(
      `INSERT INTO users(email, username, password, creation_date)
      VALUES ($1, $2, crypt($3, gen_salt('bf')), $4);`,
      [email, username, password, req.body.creation_date],
    );

    logger.info('USER ADDED', addedUser.rowCount);

    const address = await client.query(
      `INSERT INTO addresses(email, country, street, city) VALUES ($1, $2, $3, $4);`,
      [email, country, street, city],
    );
    logger.info('ADDRESS ADDED', address.rowCount);

    res.status(statusCodes.success).json({ message: 'User created' });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({
      message: 'Exception occurred while registering',
    });
  } finally {
    client.release();
  }
};

export const login = async (req: CustomRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(statusCodes.badRequest).json({ message: 'Missing parameters' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = crypt($2, password);',
      [email, password],
    );

    if (result.rows[0]) {
      req.session.user = {
        email: result.rows[0].email,
      };

      const token = jwt.sign(
        { user: { email: result.rows[0].email } },
        process.env.JWT_SECRET_KEY || '',
        {
          expiresIn: '1h',
        },
      );
      res
        .status(statusCodes.success)
        .json({ token, username: result.rows[0].username });
    } else {
      res
        .status(statusCodes.notFound)
        .json({ message: 'Incorrect email/password' });
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res
      .status(statusCodes.queryError)
      .json({ error: 'Exception occurred while logging in' });
  }
}; 