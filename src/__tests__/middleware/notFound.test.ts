// src/__tests__/middleware/notFound.test.ts
import notFound from '../../middleware/notFound';
import { Request, Response, NextFunction } from 'express';
import { statusCodes } from '../../constants/statusCodes'; // Lowercase 'C'

describe('Not Found Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let jsonResponse: any;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      originalUrl: '/nonexistent-route'
    };
    
    jsonResponse = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        jsonResponse = result;
        return mockResponse;
      })
    };
    
    mockNext = jest.fn();
  });

  it('should return 404 status code', () => {
    notFound(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);// Lowercase 'C'
  });
});