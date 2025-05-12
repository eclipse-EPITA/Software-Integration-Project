// src/__tests__/middleware/validator.test.ts
import validator, { validateSignup, validateSignin, validate } from '../../middleware/validator';
import { Request, Response, NextFunction } from 'express';
import { statusCodes } from '../../constants/statusCodes';
import { ValidationError } from '../../types/error';

describe('Validator Middleware', () => {
  describe('Main Validator', () => {
    let mockRequest: any;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
      mockRequest = {
        body: {}
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should add creation_date to request body', () => {
      validator(mockRequest, mockResponse as Response, mockNext);
      
      expect(mockRequest.body.creation_date).toBeDefined();
      expect(typeof mockRequest.body.creation_date).toBe('string');
      expect(mockRequest.body.creation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should replace empty strings with null', () => {
      mockRequest.body = {
        name: '',
        age: 25,
        email: ''
      };
      
      validator(mockRequest, mockResponse as Response, mockNext);
      
      expect(mockRequest.body.name).toBeNull();
      expect(mockRequest.body.age).toBe(25);
      expect(mockRequest.body.email).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and return 400', () => {
      // Force an error
      jest.spyOn(Object, 'entries').mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      validator(mockRequest, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid request data',
        details: 'Test error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateSignup', () => {
    it('should return errors for missing fields', () => {
      const req = { body: {} } as Request;
      const errors = validateSignup(req);
      
      expect(errors).toHaveLength(3);
      expect(errors).toEqual(expect.arrayContaining([
        { message: 'Username is required', field: 'username' },
        { message: 'Email is required', field: 'email' },
        { message: 'Password is required', field: 'password' }
      ]));
    });

    it('should return no errors when all fields are present', () => {
      const req = { 
        body: { 
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        } 
      } as Request;
      const errors = validateSignup(req);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateSignin', () => {
    it('should return errors for missing fields', () => {
      const req = { body: {} } as Request;
      const errors = validateSignin(req);
      
      expect(errors).toHaveLength(2);
      expect(errors).toEqual(expect.arrayContaining([
        { message: 'Email is required', field: 'email' },
        { message: 'Password is required', field: 'password' }
      ]));
    });

    it('should return no errors when all fields are present', () => {
      const req = { 
        body: { 
          email: 'test@example.com',
          password: 'password123'
        } 
      } as Request;
      const errors = validateSignin(req);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validate', () => {
    let mockRequest: Request;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
      mockRequest = { body: {} } as Request;
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should call next() when no validation errors', () => {
      const validationMiddleware = validate(() => []);
      validationMiddleware(mockRequest, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const mockErrors: ValidationError[] = [
        { message: 'Test error', field: 'test' }
      ];
      const validationMiddleware = validate(() => mockErrors);
      validationMiddleware(mockRequest, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ errors: mockErrors });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});