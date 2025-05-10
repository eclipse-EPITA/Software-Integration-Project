import type { Request as ExpressRequest, Response as ExpressResponse } from 'express-serve-static-core';
import { jest } from '@jest/globals';
import type { Session } from 'express-session';
import type { ParamsDictionary } from 'express-serve-static-core';

export interface UserSession extends Session {
  user?: {
    _id: string;
    email: string;
  };
}

export interface RatingRequestBody {
  rating: number;
}

export interface CustomRequest extends ExpressRequest {
  user?: {
    _id: string;
    email: string;
  };
  session: UserSession;
  params: ParamsDictionary;
}

export interface CustomRequestWithBody<T extends Record<string, unknown>> extends CustomRequest {
  body: T;
}

export interface CommentRequestBody {
  comment: string;
  title: string;
}

export interface MessageRequestBody {
  message?: {
    name: string;
    content?: string;
  };
  name?: string;
}

export interface ProfileRequestBody {
  oldPassword?: string;
  newPassword?: string;
}

// Mock interfaces for testing
export interface MockRequest extends Partial<ExpressRequest> {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    _id: string;
    email: string;
  };
  session?: {
    destroy: () => void;
    user?: {
      _id: string;
      email: string;
    };
  };
}

export interface MockResponse extends Partial<ExpressResponse> {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [Record<string, unknown>]>;
  send: jest.Mock<MockResponse, [Record<string, unknown>]>;
  end: jest.Mock<MockResponse, []>;
  setHeader: jest.Mock<MockResponse, [string, string]>;
  getHeader: jest.Mock<string | string[] | undefined, [string]>;
  removeHeader: jest.Mock<MockResponse, [string]>;
  clearCookie: jest.Mock<MockResponse, [string]>;
  cookie: jest.Mock<MockResponse, [string, string]>;
}

export interface MockNext extends jest.Mock {}

export interface MockDocument {
  _id: string;
  save: jest.Mock;
}

export interface MockPool {
  query: jest.Mock;
  connect: jest.Mock;
}

export interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

// Declare global Jest types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMongoId(): R;
    }
  }

  // Declare Jest globals
  const describe: jest.Describe;
  const beforeAll: jest.Lifecycle;
  const afterAll: jest.Lifecycle;
  const beforeEach: jest.Lifecycle;
  const afterEach: jest.Lifecycle;
  const it: jest.It;
  const expect: jest.Expect;
  const jest: typeof import('@jest/globals')['jest'];
}