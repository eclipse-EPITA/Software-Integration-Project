import { Router } from 'express';
import { addRating } from '../controllers/rating.controller';

const ratingRouter = Router();

ratingRouter.post('/:movieId', addRating);

export { ratingRouter as router };
