import { Router } from 'express';
import {
  getMovies,
  getMovieById,
  addMovie,
  updateMovie,
  deleteMovie,
  getTopRatedMovies,
  getSeenMovies
} from '../controllers/movies.controller';

export const router = Router();

router.get('/', getMovies);
router.get('/top', getTopRatedMovies);
router.get('/me', getSeenMovies);
router.get('/:id', getMovieById);
router.post('/', addMovie);
router.put('/:id', updateMovie);
router.delete('/:id', deleteMovie);
