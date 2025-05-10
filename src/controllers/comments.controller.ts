import { Response } from 'express';
import { statusCodes } from '../constants/statusCodes';
import logger from '../middleware/winston';
import CommentModel from '../models/commentModel';
import { CustomRequest } from '../types/express';

// Define CommentRequestBody interface with all required properties
interface CommentRequestBody {
  rating: number;
  username: string;
  comment: string;
  title: string;
}

export const addComment = async (req: CustomRequest, res: Response): Promise<void> => {
  const { movie_id } = req.params;
  const { rating, username, comment, title } = req.body as CommentRequestBody;

  const movieId = parseInt(movie_id || '');

  if (
    !movie_id ||
    isNaN(movieId) ||
    !rating ||
    !username ||
    !comment ||
    !title
  ) {
    res.status(statusCodes.badRequest).json({ error: 'Missing parameters' });
    return;
  }

  if (rating < 1 || rating > 5) {
    res.status(statusCodes.badRequest).json({ error: 'Rating must be between 1 and 5' });
    return;
  }

  if (username.length < 3 || username.length > 50) {
    res.status(statusCodes.badRequest).json({ error: 'Username must be between 3 and 50 characters' });
    return;
  }

  if (title.length < 3 || title.length > 100) {
    res.status(statusCodes.badRequest).json({ error: 'Title must be between 3 and 100 characters' });
    return;
  }

  if (comment.length < 10 || comment.length > 1000) {
    res.status(statusCodes.badRequest).json({ error: 'Comment must be between 10 and 1000 characters' });
    return;
  }

  try {
    const commentObj = new CommentModel({
      movie_id: movieId,
      rating,
      username,
      comment,
      title,
    });

    await commentObj.save();

    res.status(statusCodes.success).json({ message: 'Comment added' });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res
      .status(statusCodes.queryError)
      .json({ error: 'Exception occurred while adding comment' });
  }
};

export const getCommentsById = async (req: CustomRequest, res: Response): Promise<void> => {
  const { movie_id } = req.params;

  const movieId = parseInt(movie_id || '');

  if (!movie_id || isNaN(movieId)) {
    res.status(statusCodes.badRequest).json({ error: 'Invalid movie ID' });
    return;
  }

  try {
    const comments = await CommentModel.find({ movie_id: movieId });
    res.status(statusCodes.success).json({ comments });
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : 'Unknown error');
    res
      .status(statusCodes.queryError)
      .json({ error: 'Exception occurred while fetching comments' });
  }
}; 