import { Response } from 'express';
import type { Request } from 'express';
import { QueryResult } from 'pg';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import pool from '../boot/database/db_connect';

interface Movie {
  id: number;
  title: string;
  description: string;
  rating?: number;
}

interface CustomRequest extends Request {
  user?: {
    email: string;
    id?: string;
  };
  params: {
    id?: string;
  };
  body: {
    title?: string;
    description?: string;
  };
}

export const getMovies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result: QueryResult<Movie> = await pool.query('SELECT * FROM movies');
    res.status(statusCodes.success).json(result.rows);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error fetching movies' });
  }
};

export const getMovieById = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const movieId = parseInt(id || '');

  if (!id || isNaN(movieId)) {
    res.status(statusCodes.badRequest).json({ error: 'Invalid movie ID' });
    return;
  }

  try {
    const result: QueryResult<Movie> = await pool.query('SELECT * FROM movies WHERE id = $1', [movieId]);
    
    if (result.rows.length === 0) {
      res.status(statusCodes.notFound).json({ error: 'Movie not found' });
      return;
    }
    
    res.status(statusCodes.success).json(result.rows[0]);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error fetching movie' });
  }
};

export const addMovie = async (req: CustomRequest, res: Response): Promise<void> => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(statusCodes.badRequest).json({ error: 'Title and description are required' });
    return;
  }

  if (title.length < 3 || title.length > 100) {
    res.status(statusCodes.badRequest).json({ error: 'Title must be between 3 and 100 characters' });
    return;
  }

  if (description.length < 10 || description.length > 1000) {
    res.status(statusCodes.badRequest).json({ error: 'Description must be between 10 and 1000 characters' });
    return;
  }

  try {
    const result: QueryResult<Movie> = await pool.query(
      'INSERT INTO movies (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    res.status(statusCodes.created).json(result.rows[0]);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error adding movie' });
  }
};

export const updateMovie = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description } = req.body;
  const movieId = parseInt(id || '');

  if (!id || isNaN(movieId)) {
    res.status(statusCodes.badRequest).json({ error: 'Invalid movie ID' });
    return;
  }

  if (!title && !description) {
    res.status(statusCodes.badRequest).json({ error: 'At least one field (title or description) is required' });
    return;
  }

  if (title && (title.length < 3 || title.length > 100)) {
    res.status(statusCodes.badRequest).json({ error: 'Title must be between 3 and 100 characters' });
    return;
  }

  if (description && (description.length < 10 || description.length > 1000)) {
    res.status(statusCodes.badRequest).json({ error: 'Description must be between 10 and 1000 characters' });
    return;
  }

  try {
    const result: QueryResult<Movie> = await pool.query(
      'UPDATE movies SET title = COALESCE($1, title), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [title, description, movieId]
    );
    
    if (result.rows.length === 0) {
      res.status(statusCodes.notFound).json({ error: 'Movie not found' });
      return;
    }
    
    res.status(statusCodes.success).json(result.rows[0]);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error updating movie' });
  }
};

export const deleteMovie = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const movieId = parseInt(id || '');

  if (!id || isNaN(movieId)) {
    res.status(statusCodes.badRequest).json({ error: 'Invalid movie ID' });
    return;
  }

  try {
    const result: QueryResult<Movie> = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [movieId]);
    
    if (result.rows.length === 0) {
      res.status(statusCodes.notFound).json({ error: 'Movie not found' });
      return;
    }
    
    res.status(statusCodes.success).json({ message: 'Movie deleted successfully' });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error deleting movie' });
  }
};

export const getTopRatedMovies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result: QueryResult<Movie> = await pool.query('SELECT * FROM movies ORDER BY rating DESC LIMIT 10');
    res.status(statusCodes.success).json(result.rows);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error fetching top rated movies' });
  }
};

export const getSeenMovies = async (req: CustomRequest, res: Response): Promise<void> => {
  if (!req.user?.email) {
    res.status(statusCodes.unauthorized).json({ error: 'User not authenticated' });
    return;
  }

  try {
    const result: QueryResult<Movie> = await pool.query(
      'SELECT * FROM seen_movies S JOIN movies M ON S.movie_id = M.movie_id WHERE email = $1',
      [req.user.email]
    );
    res.status(statusCodes.success).json(result.rows);
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res.status(statusCodes.queryError).json({ error: 'Error fetching seen movies' });
  }
}; 