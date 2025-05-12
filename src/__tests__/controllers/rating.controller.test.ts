// src/__tests__/controllers/rating.controller.test.ts
import { addRating } from '../../controllers/rating.controller';
import { Request, Response } from 'express';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';
import pool from '../../boot/database/db_connect';
import RatingModel from '../../models/ratingModel';

// Mock dependencies
jest.mock('../../boot/database/db_connect');
jest.mock('../../models/ratingModel');
jest.mock('../../middleware/winston');

describe('Rating Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockClient: any;

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
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query.mockImplementation((query: string, values?: any[]) => {
      if (query.includes('BEGIN')) return Promise.resolve();
      if (query.includes('COMMIT')) return Promise.resolve();
      if (query.includes('ROLLBACK')) return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });
  });

  describe('addRating', () => {
    const validRequest = {
      params: { movieId: '123' },
      body: { rating: 4 },
      user: { email: 'user@example.com' }
    };

    it('should add a rating successfully', async () => {
      // Mock movie exists
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ movie_id: 123 }] });
      // Mock no existing rating
      (RatingModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      // Mock rating save
      (RatingModel.prototype.save as jest.Mock).mockResolvedValueOnce({});
      // Mock ratings calculation
      (RatingModel.find as jest.Mock).mockResolvedValueOnce([{ rating: 4 }, { rating: 5 }]);

      await addRating(validRequest as any, mockResponse as Response);

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      // Verify database operations
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT movie_id FROM movies WHERE movie_id = $1',
        [123]
      );
      expect(RatingModel.findOne).toHaveBeenCalledWith({
        email: 'user@example.com',
        movie_id: 123
      });
      expect(RatingModel.prototype.save).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE movies SET rating = $1 WHERE movie_id = $2;',
        [4.5, 123]
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Rating added successfully'
      });
    });

    it('should reject invalid parameters', async () => {
      const testCases = [
        { params: {}, body: { rating: 4 }, user: { email: 'user@example.com' }, expected: 'Missing or invalid parameters' },
        { params: { movieId: 'invalid' }, body: { rating: 4 }, user: { email: 'user@example.com' }, expected: 'Missing or invalid parameters' },
        { params: { movieId: '123' }, body: {}, user: { email: 'user@example.com' }, expected: 'Missing or invalid parameters' },
        { params: { movieId: '123' }, body: { rating: 4 }, user: {}, expected: 'Missing or invalid parameters' }
      ];

      for (const testCase of testCases) {
        mockRequest = testCase;
        await addRating(mockRequest as any, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate rating range', async () => {
      const testCases = [
        { rating: 0, expected: 'Rating must be between 1 and 5' },
        { rating: 6, expected: 'Rating must be between 1 and 5' }
      ];

      for (const testCase of testCases) {
        mockRequest = {
          params: { movieId: '123' },
          body: { rating: testCase.rating },
          user: { _id: 'mockId123', email: 'user@example.com' }
        };
        await addRating(mockRequest as any, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should reject if movie not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await addRating(validRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Movie not found' });
    });

    it('should reject duplicate ratings', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ movie_id: 123 }] });
      (RatingModel.findOne as jest.Mock).mockResolvedValueOnce({ rating: 4 });

      await addRating(validRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'You have already rated this movie'
      });
    });

    it('should handle database errors with rollback', async () => {
      // Mock movie exists
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ movie_id: 123 }] });
      // Mock no existing rating
      (RatingModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      // Force error during save
      (RatingModel.prototype.save as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await addRating(validRequest as any, mockResponse as Response);

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Exception occurred while adding rating'
      });
    });

    it('should correctly calculate average rating', async () => {
      // Mock movie exists
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ movie_id: 123 }] });
      // Mock no existing rating
      (RatingModel.findOne as jest.Mock).mockResolvedValueOnce(null);
      // Mock rating save
      (RatingModel.prototype.save as jest.Mock).mockResolvedValueOnce({});
      // Mock ratings calculation with specific values
      (RatingModel.find as jest.Mock).mockResolvedValueOnce([
        { rating: 3 },
        { rating: 4 },
        { rating: 5 }
      ]);

      await addRating(validRequest as any, mockResponse as Response);

      // Verify correct average calculation (3+4+5)/3 = 4
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE movies SET rating = $1 WHERE movie_id = $2;',
        [4, 123]
      );
    });
  });
});