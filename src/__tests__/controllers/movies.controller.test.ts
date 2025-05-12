// src/__tests__/controllers/movies.controller.test.ts
import {
  getMovies,
  getMovieById,
  addMovie,
  updateMovie,
  deleteMovie,
  getTopRatedMovies,
  getSeenMovies
} from '../../controllers/movies.controller';
import { Request, Response } from 'express';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';
import pool from '../../boot/database/db_connect';

// Mock dependencies
jest.mock('../../boot/database/db_connect');
jest.mock('../../middleware/winston');

describe('Movies Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      user: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getMovies', () => {
    it('should fetch all movies successfully', async () => {
      const mockMovies = [
        { id: 1, title: 'Movie 1', description: 'Description 1' },
        { id: 2, title: 'Movie 2', description: 'Description 2' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockMovies });

      await getMovies(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM movies');
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMovies);
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await getMovies(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error fetching movies' });
    });
  });

  describe('getMovieById', () => {
    it('should fetch a movie by ID successfully', async () => {
      mockRequest.params = { id: '1' };
      const mockMovie = { id: 1, title: 'Test Movie', description: 'Test Description' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockMovie] });

      await getMovieById(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM movies WHERE id = $1', [1]);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMovie);
    });

    it('should reject invalid movie ID', async () => {
      const testCases = [
        { id: 'invalid', expected: 'Invalid movie ID' },
        { id: '', expected: 'Invalid movie ID' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { id: testCase.id };

        await getMovieById(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should handle movie not found', async () => {
      mockRequest.params = { id: '999' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getMovieById(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Movie not found' });
    });
  });

  describe('addMovie', () => {
    const validMovie = {
      title: 'Valid Movie Title',
      description: 'This is a valid movie description that meets all requirements.'
    };

    it('should add a new movie successfully', async () => {
      mockRequest.body = validMovie;
      const mockNewMovie = { id: 1, ...validMovie };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockNewMovie] });

      await addMovie(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO movies (title, description) VALUES ($1, $2) RETURNING *',
        [validMovie.title, validMovie.description]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.created);
      expect(mockResponse.json).toHaveBeenCalledWith(mockNewMovie);
    });

    it('should validate required fields', async () => {
      const testCases = [
        { title: '', description: 'Valid', expected: 'Title and description are required' },
        { title: 'Valid', description: '', expected: 'Title and description are required' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = { title: testCase.title, description: testCase.description };

        await addMovie(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate title length', async () => {
      const testCases = [
        { title: 'ab', expected: 'Title must be between 3 and 100 characters' },
        { title: 'a'.repeat(101), expected: 'Title must be between 3 and 100 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = { title: testCase.title, description: 'Valid description' };

        await addMovie(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate description length', async () => {
      const testCases = [
        { description: 'short', expected: 'Description must be between 10 and 1000 characters' },
        { description: 'a'.repeat(1001), expected: 'Description must be between 10 and 1000 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = { title: 'Valid title', description: testCase.description };

        await addMovie(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });
  });

  describe('updateMovie', () => {
    const validUpdate = {
      title: 'Updated Title',
      description: 'Updated description that meets all requirements.'
    };

    it('should update a movie successfully', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = validUpdate;
      const mockUpdatedMovie = { id: 1, ...validUpdate };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUpdatedMovie] });

      await updateMovie(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE movies SET title = COALESCE($1, title), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
        [validUpdate.title, validUpdate.description, 1]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedMovie);
    });

    it('should validate at least one field is provided', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      await updateMovie(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'At least one field (title or description) is required'
      });
    });

    it('should validate partial updates', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Title Only' };
      const mockUpdatedMovie = { id: 1, title: 'Updated Title Only', description: 'Original Description' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUpdatedMovie] });

      await updateMovie(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE movies SET title = COALESCE($1, title), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
        ['Updated Title Only', undefined, 1]
      );
    });
  });

  describe('deleteMovie', () => {
    it('should delete a movie successfully', async () => {
      mockRequest.params = { id: '1' };
      const mockDeletedMovie = { id: 1, title: 'Deleted Movie' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockDeletedMovie] });

      await deleteMovie(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith('DELETE FROM movies WHERE id = $1 RETURNING *', [1]);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Movie deleted successfully' });
    });
  });

  describe('getTopRatedMovies', () => {
    it('should fetch top rated movies successfully', async () => {
      const mockMovies = [
        { id: 1, title: 'Top Movie 1', rating: 5 },
        { id: 2, title: 'Top Movie 2', rating: 4.9 }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockMovies });

      await getTopRatedMovies(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM movies ORDER BY rating DESC LIMIT 10');
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMovies);
    });
  });

  describe('getSeenMovies', () => {
    it('should fetch seen movies for authenticated user', async () => {
      mockRequest.user = { email: 'user@example.com' };
      const mockMovies = [
        { id: 1, title: 'Seen Movie 1' },
        { id: 2, title: 'Seen Movie 2' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockMovies });

      await getSeenMovies(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM seen_movies S JOIN movies M ON S.movie_id = M.movie_id WHERE email = $1',
        ['user@example.com']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMovies);
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.user = {};

      await getSeenMovies(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.unauthorized);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });
  });
});