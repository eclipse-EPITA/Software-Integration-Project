import { Request, Response } from 'express';
import { Session } from 'express-session';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import pool from '../boot/database/db_connect';
import { QueryResult } from 'pg';

interface ProfileRequestBody {
  oldPassword?: string;
  newPassword?: string;
}

interface UserSession extends Session {
  user?: {
    _id: string;
  };
}

interface CustomRequest extends Request {
  user?: {
    email: string;
  };
  session: UserSession;
  body: ProfileRequestBody;
}

interface UserRow {
  email: string;
  password: string;
}

export const editPassword = async (req: CustomRequest, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || !req.user?.email) {
    res.status(statusCodes.badRequest).json({ message: 'Missing parameters' });
    return;
  }

  if (oldPassword === newPassword) {
    res
      .status(statusCodes.badRequest)
      .json({ message: 'New password cannot be equal to old password' });
    return;
  }

  if (newPassword.length < 6) {
    res
      .status(statusCodes.badRequest)
      .json({ message: 'New password must be at least 6 characters long' });
    return;
  }

  try {
    const verifyResult: QueryResult<UserRow> = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = crypt($2, password);',
      [req.user.email, oldPassword],
    );

    if (!verifyResult.rows[0]) {
      res
        .status(statusCodes.badRequest)
        .json({ message: 'Incorrect password' });
      return;
    }

    await pool.query(
      "UPDATE users SET password = crypt($1, gen_salt('bf')) WHERE email = $2;",
      [newPassword, req.user.email],
    );

    res
      .status(statusCodes.success)
      .json({ message: 'Password updated' });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res
      .status(statusCodes.queryError)
      .json({ error: 'Exception occurred while updating password' });
  }
};

export const logout = async (req: CustomRequest, res: Response): Promise<void> => {
  if (req.session.user) {
    delete req.session.user;
  }

  res.status(statusCodes.success).json({ message: 'Disconnected' });
}; 