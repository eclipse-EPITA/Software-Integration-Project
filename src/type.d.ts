import '@types/jest';
import { ExpressRequest, ExpressResponse } from './types/express';
import { jest } from '@jest/globals';
import {
  UserDocument,
  MessageDocument,
  CommentDocument,
  RatingDocument
} from './types/database';

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

export interface MockResponse extends Partial<ExpressResponse> {
  status: jest.Mock;
  json: jest.Mock;
}

export interface MockRequest extends Partial<ExpressRequest> {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
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

export interface MockPool {
  query: jest.Mock;
  connect: jest.Mock;
}

export interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

export {
  UserDocument,
  MessageDocument,
  CommentDocument,
  RatingDocument
}; 