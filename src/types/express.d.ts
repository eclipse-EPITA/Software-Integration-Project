import { Request, Response, NextFunction } from 'express';
import { Session, SessionData } from 'express-session';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
      };
      session?: {
        id?: string;
        cookie?: any;
        regenerate?: (callback: (err: any) => void) => void;
        destroy: (callback: (err: any) => void) => void;
        reload?: (callback: (err: any) => void) => void;
        save?: (callback: (err: any) => void) => void;
        touch?: () => void;
        user?: {
          _id: string;
          email: string;
        };
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: {
      _id: string;
      id?: string;
      email: string;
    };
  }
}

interface CustomRequest extends Request {
  session: Session & {
    user?: {
      _id: string;
      email: string;
    };
  };
  user?: {
    _id: string;
    email: string;
  };
}

export interface CustomRequestWithBody<T = any> extends CustomRequest {
  body: T;
}

export interface UserSession extends Session {
  user?: {
    _id: string;
    email: string;
  };
  destroy: (callback?: (err: any) => void) => void;
}

export { CustomRequest };
export type { Request, Response, NextFunction }; 