import { Request, Response } from 'express';
import { PoolClient, QueryResult } from 'pg';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import pool from '../boot/database/db_connect';
import RatingModel from '../models/ratingModel';

interface RatingRequestBody {
  rating: number;
}

interface Rating {
  rating: number;
}

interface CustomRequest extends Request {
  user?: {
    email: string;
  };
  params: {
    movieId: string;
  };
  body: RatingRequestBody;
}

export const addRating = async (req: CustomRequest, res: Response): Promise<void> => {
  const { movieId } = req.params;
  const { rating } = req.body;

  const movie_id = parseInt(movieId);

  if (isNaN(movie_id) || !rating || !req.user?.email) {
    res.status(statusCodes.badRequest).json({ error: 'Missing or invalid parameters' });
    return;
  }

  if (rating < 1 || rating > 5) {
    res.status(statusCodes.badRequest).json({ error: 'Rating must be between 1 and 5' });
    return;
  }

  let client: PoolClient | null = null;

  try {
    // Check if movie exists
    const movieResult: QueryResult = await pool.query(
      'SELECT movie_id FROM movies WHERE movie_id = $1',
      [movie_id]
    );

    if (movieResult.rows.length === 0) {
      res.status(statusCodes.notFound).json({ error: 'Movie not found' });
      return;
    }

    // Check if user has already rated this movie
    const existingRating = await RatingModel.findOne({
      email: req.user.email,
      movie_id,
    });

    if (existingRating) {
      res.status(statusCodes.badRequest).json({ error: 'You have already rated this movie' });
      return;
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const ratingObj = new RatingModel({
      email: req.user.email,
      movie_id,
      rating,
    });

    await ratingObj.save();

    const ratings = await RatingModel.find({ movie_id }, { rating });

    const averageRating = ratings.reduce(
      (acc: number, rating: Rating) => acc + rating.rating,
      0,
    ) / ratings.length;

    await client.query('UPDATE movies SET rating = $1 WHERE movie_id = $2;', [
      averageRating,
      movie_id,
    ]);

    await client.query('COMMIT');
    res.status(statusCodes.success).json({ message: 'Rating added successfully' });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res
      .status(statusCodes.queryError)
      .json({ error: 'Exception occurred while adding rating' });
  } finally {
    if (client) {
      client.release();
    }
  }
}; 