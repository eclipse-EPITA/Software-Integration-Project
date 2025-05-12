import { Request, Response } from 'express';
import { Session } from 'express-session';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel, { IUser } from '../models/userModel';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import { CustomRequest } from '../types/express';

interface AuthRequestBody {
  username?: string;
  email?: string;
  password?: string;
}

interface UserSession extends Session {
  user?: {
    _id: string;
    email: string;
  };
}

interface CustomRequestWithBody extends CustomRequest {
  body: AuthRequestBody;
  session: UserSession;
}

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body;

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(statusCodes.badRequest).json({ error: 'Email already registered' });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);

    const newUser = new UserModel({
      email,
      username,
      password: hash
    });

    await newUser.save();

    res.status(statusCodes.created).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.serverError).json({ error: 'Error registering user' });
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email }).lean<IUser>();

    if (!user) {
      res.status(statusCodes.unauthorized).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      res.status(statusCodes.unauthorized).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    res.status(statusCodes.ok).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.serverError).json({ error: 'Error signing in' });
  }
};

export const getProfile = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const user = await UserModel
      .findById(req.session.user?._id, {
        password: 0,
        __v: 0
      })
      .lean<IUser>();

    if (!user) {
      res.status(statusCodes.notFound).json({ error: 'User not found' });
      return;
    }

    res.status(statusCodes.ok).json({ user });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.serverError).json({ error: 'Error fetching profile' });
  }
};

export const logout = (req: CustomRequestWithBody, res: Response): void => {
  if (req.session.user) {
    delete req.session.user;
  }

  res.status(statusCodes.success).json({ message: 'Logged out successfully' });
}; 