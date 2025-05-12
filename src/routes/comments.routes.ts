import { Router } from 'express';
import { getCommentsById, addComment } from '../controllers/comments.controller';

export const router = Router();

router.get('/:movie_id', getCommentsById);
router.post('/:movie_id', addComment);
