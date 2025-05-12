import { Pool } from 'pg';
import { Document } from 'mongoose';

declare module '*/db_connect' {
  const pool: Pool;
  export default pool;
}

export interface IRating {
  email: string;
  movie_id: number;
  rating: number;
  save(): Promise<void>;
}

export interface RatingModel {
  new(data: Partial<IRating>): IRating;
  find(query: Record<string, unknown>, projection?: Record<string, unknown>): Promise<IRating[]>;
}

declare module '*/ratingModel' {
  const model: RatingModel;
  export default model;
}

interface UserDocument extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageDocument extends Document {
  sender: string;
  receiver: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CommentDocument extends Document {
  user: string;
  movie: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RatingDocument extends Document {
  user: string;
  movie: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

interface DatabaseClient {
  query<T>(queryText: string, values?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

interface DatabasePool {
  connect(): Promise<DatabaseClient>;
  query<T>(queryText: string, values?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

export {
  UserDocument,
  MessageDocument,
  CommentDocument,
  RatingDocument,
  DatabaseClient,
  DatabasePool,
  QueryResult
}; 