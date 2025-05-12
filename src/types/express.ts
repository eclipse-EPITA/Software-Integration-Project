import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction, ParamsDictionary } from 'express-serve-static-core';
import type { Session } from 'express-session';

export type Request = ExpressRequest;
export type Response = ExpressResponse;
export type NextFunction = ExpressNextFunction;

export interface UserSession extends Session {
  user?: {
    _id: string;
    email: string;
  };
}

export interface CustomRequest extends Omit<ExpressRequest, 'session'> {
  session: UserSession;
  user?: {
    _id: string;
    email: string;
  };
  params: ParamsDictionary;
}

export interface CustomRequestWithBody<T extends Record<string, unknown>> extends Omit<CustomRequest, 'body'> {
  body: T;
} 