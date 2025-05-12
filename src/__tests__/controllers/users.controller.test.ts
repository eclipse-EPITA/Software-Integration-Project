// src/__tests__/controllers/users.controller.test.ts
import { register, login } from '../../controllers/users.controller';
import { Request, Response } from 'express';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';
import pool from '../../boot/database/db_connect';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../boot/database/db_connect');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/winston');

describe('Users Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockClient: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      session: {} as any
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
    (jwt.sign as jest.Mock).mockReturnValue('mockToken');
  });

  describe('register', () => {
    const validRequest = {
      body: {
        email: 'test@example.com',
        username: 'testuser',
        password: 'securePassword123',
        country: 'Test Country',
        city: 'Test City',
        street: 'Test Street'
      }
    };

    it('should register a new user successfully', async () => {
      // Mock no existing user
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
      // Mock user insert
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock address insert
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await register(validRequest as any, mockResponse as Response);

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      // Verify database operations
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1;',
        ['test@example.com']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        `INSERT INTO users(email, username, password, creation_date)
        VALUES ($1, $2, crypt($3, gen_salt('bf')), $4);`,
        ['test@example.com', 'testuser', 'securePassword123', undefined]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        `INSERT INTO addresses(email, country, street, city) VALUES ($1, $2, $3, $4);`,
        ['test@example.com', 'Test Country', 'Test Street', 'Test City']
      );
      
      expect(logger.info).toHaveBeenCalledWith('USER ADDED', 1);
      expect(logger.info).toHaveBeenCalledWith('ADDRESS ADDED', 1);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User created' });
    });

    it('should reject missing required fields', async () => {
      const testCases = [
        { email: '', username: 'test', password: 'test', country: 'test', expected: 'Missing parameters' },
        { email: 'test@test.com', username: '', password: 'test', country: 'test', expected: 'Missing parameters' },
        { email: 'test@test.com', username: 'test', password: '', country: 'test', expected: 'Missing parameters' },
        { email: 'test@test.com', username: 'test', password: 'test', country: '', expected: 'Missing parameters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = {
          email: testCase.email,
          username: testCase.username,
          password: testCase.password,
          country: testCase.country
        };

        await register(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: testCase.expected });
      }
    });

    it('should reject existing user', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await register(validRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.userAlreadyExists);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User already has an account'
      });
    });

    it('should handle database errors with rollback', async () => {
      // Mock no existing user
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
      // Force error during user insert
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await register(validRequest as any, mockResponse as Response);

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Exception occurred while registering'
      });
    });

    it('should handle partial address info', async () => {
      const partialRequest = {
        body: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'securePassword123',
          country: 'Test Country'
        }
      };

      // Mock no existing user
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
      // Mock user insert
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // Mock address insert with nulls
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await register(partialRequest as any, mockResponse as Response);

      expect(mockClient.query).toHaveBeenCalledWith(
        `INSERT INTO addresses(email, country, street, city) VALUES ($1, $2, $3, $4);`,
        ['test@example.com', 'Test Country', undefined, undefined]
      );
    });
  });

  describe('login', () => {
    const validRequest = {
      body: {
        email: 'test@example.com',
        password: 'securePassword123'
      }
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        email: 'test@example.com',
        username: 'testuser'
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await login(validRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND password = crypt($2, password);',
        ['test@example.com', 'securePassword123']
      );
      expect(mockRequest.session.user).toEqual({ email: 'test@example.com' });
      expect(jwt.sign).toHaveBeenCalledWith(
        { user: { email: 'test@example.com' } },
        process.env.JWT_SECRET_KEY || '',
        { expiresIn: '1h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: 'mockToken',
        username: 'testuser'
      });
    });

    it('should reject missing credentials', async () => {
      const testCases = [
        { email: '', password: 'test', expected: 'Missing parameters' },
        { email: 'test@test.com', password: '', expected: 'Missing parameters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = {
          email: testCase.email,
          password: testCase.password
        };

        await login(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: testCase.expected });
      }
    });

    it('should reject invalid credentials', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await login(validRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incorrect email/password'
      });
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await login(validRequest as any, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Exception occurred while logging in'
      });
    });
  });
});