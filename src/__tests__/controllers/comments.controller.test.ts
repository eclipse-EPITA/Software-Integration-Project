// src/__tests__/controllers/comments.controller.test.ts
import { addComment, getCommentsById } from '../../controllers/comments.controller';
import { Request, Response } from 'express';
import CommentModel from '../../models/commentModel';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';

// Mock dependencies
jest.mock('../../models/commentModel');
jest.mock('../../middleware/winston');

describe('Comments Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('addComment', () => {
    const validComment = {
      rating: 4,
      username: 'testuser',
      comment: 'This is a valid comment that meets all requirements.',
      title: 'Valid Title'
    };

    it('should successfully add a comment', async () => {
      mockRequest.params = { movie_id: '123' };
      mockRequest.body = validComment;

      (CommentModel.prototype.save as jest.Mock).mockResolvedValue({});

      await addComment(mockRequest as any, mockResponse as Response);

      expect(CommentModel.prototype.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Comment added' });
    });

    it('should reject missing parameters', async () => {
      mockRequest.params = { movie_id: '123' };
      mockRequest.body = {};

      await addComment(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing parameters' });
    });

    it('should validate rating range', async () => {
      const testCases = [
        { rating: 0, expected: 'Rating must be between 1 and 5' },
        { rating: 6, expected: 'Rating must be between 1 and 5' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { movie_id: '123' };
        mockRequest.body = { ...validComment, rating: testCase.rating };

        await addComment(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate username length', async () => {
      const testCases = [
        { username: 'ab', expected: 'Username must be between 3 and 50 characters' },
        { username: 'a'.repeat(51), expected: 'Username must be between 3 and 50 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { movie_id: '123' };
        mockRequest.body = { ...validComment, username: testCase.username };

        await addComment(mockRequest as any, mockResponse as Response);

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
        mockRequest.params = { movie_id: '123' };
        mockRequest.body = { ...validComment, title: testCase.title };

        await addComment(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate comment length', async () => {
      const testCases = [
        { comment: 'short', expected: 'Comment must be between 10 and 1000 characters' },
        { comment: 'a'.repeat(1001), expected: 'Comment must be between 10 and 1000 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { movie_id: '123' };
        mockRequest.body = { ...validComment, comment: testCase.comment };

        await addComment(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should handle database errors', async () => {
      mockRequest.params = { movie_id: '123' };
      mockRequest.body = validComment;

      (CommentModel.prototype.save as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await addComment(mockRequest as any, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Exception occurred while adding comment'
      });
    });
  });

  describe('getCommentsById', () => {
    it('should fetch comments for a valid movie ID', async () => {
      mockRequest.params = { movie_id: '123' };
      const mockComments = [
        { movie_id: 123, comment: 'Test comment 1' },
        { movie_id: 123, comment: 'Test comment 2' }
      ];

      (CommentModel.find as jest.Mock).mockResolvedValue(mockComments);

      await getCommentsById(mockRequest as any, mockResponse as Response);

      expect(CommentModel.find).toHaveBeenCalledWith({ movie_id: 123 });
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ comments: mockComments });
    });

    it('should reject invalid movie ID', async () => {
      const testCases = [
        { movie_id: 'invalid', expected: 'Invalid movie ID' },
        { movie_id: '', expected: 'Invalid movie ID' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { movie_id: testCase.movie_id };

        await getCommentsById(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should handle database errors', async () => {
      mockRequest.params = { movie_id: '123' };

      (CommentModel.find as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await getCommentsById(mockRequest as any, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Exception occurred while fetching comments'
      });
    });
  });
});