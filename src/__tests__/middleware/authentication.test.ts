// src/__tests__/middleware/authentication.test.ts
import { verifyToken } from '../../middleware/authentication';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { statusCodes } from '../../constants/statusCodes';

// Mock JWT secret and test data
const JWT_SECRET = 'test-secret';
const mockUser = {
  id: '123',
  email: 'test@example.com'
};
const validToken = jwt.sign({ user: mockUser }, JWT_SECRET, { expiresIn: '1h' });
const expiredToken = jwt.sign({ user: mockUser }, JWT_SECRET, { expiresIn: '-1s' });

// Mock Express objects
const mockRequest = (headers: any = {}) => ({
  header: (name: string) => headers[name],
  headers
}) as unknown as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('Authentication Middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET_KEY = JWT_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access with valid token', () => {
    const req = mockRequest({ Authorization: `Bearer ${validToken}` });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
  });

  it('should reject request with no token', () => {
    const req = mockRequest();
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with malformed token', () => {
    const req = mockRequest({ Authorization: 'InvalidTokenFormat' });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with expired token', () => {
    const req = mockRequest({ Authorization: `Bearer ${expiredToken}` });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', () => {
    const req = mockRequest({ Authorization: 'Bearer invalid.token.here' });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject token with invalid payload', () => {
    const invalidPayloadToken = jwt.sign({ invalid: 'payload' }, JWT_SECRET);
    const req = mockRequest({ Authorization: `Bearer ${invalidPayloadToken}` });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token payload' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle unexpected errors', () => {
    // Mock jwt.verify to throw unexpected error
    jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });
    
    const req = mockRequest({ Authorization: `Bearer ${validToken}` });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should trim whitespace from Authorization header', () => {
    const req = mockRequest({ Authorization: `   Bearer   ${validToken}   ` });
    const res = mockResponse();
    
    verifyToken(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
  });
});