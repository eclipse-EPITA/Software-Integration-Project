// src/__tests__/controllers/auth.controller.test.ts
import { signup, signin, getProfile, logout } from '../../controllers/auth.controller';
import { Request, Response } from 'express';
import UserModel from '../../models/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';

// Mock all dependencies
jest.mock('../../models/userModel');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/winston');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      session: {} as any
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should register a new user successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hashSync as jest.Mock).mockReturnValue('hashedPassword');
      (UserModel.prototype.save as jest.Mock).mockResolvedValue({});

      await signup(mockRequest as Request, mockResponse as Response);

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.hashSync).toHaveBeenCalledWith('password123', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.created);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User registered successfully' });
    });

    it('should reject duplicate email', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        username: 'testuser',
        password: 'password123'
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue({ email: 'existing@example.com' });

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should handle errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      (UserModel.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await signup(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.serverError);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error registering user' });
    });
  });

  describe('signin', () => {
    it('should authenticate user with valid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword'
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mockToken');

      await signin(mockRequest as Request, mockResponse as Response);

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compareSync).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { _id: '123', email: 'test@example.com' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.ok);
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: 'mockToken',
        user: {
          _id: '123',
          email: 'test@example.com',
          username: 'testuser'
        }
      });
    });

    it('should reject invalid credentials', async () => {
      mockRequest.body = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      // Case 1: User not found
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      await signin(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.unauthorized);

      // Case 2: Wrong password
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashedPassword'
      };
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);
      await signin(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.unauthorized);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockRequest.session = {
        user: { _id: '123', email: 'test@example.com' }
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        username: 'testuser'
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      await getProfile(mockRequest as any, mockResponse as Response);

      expect(UserModel.findById).toHaveBeenCalledWith('123', { password: 0, __v: 0 });
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.ok);
      expect(mockResponse.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should handle user not found', async () => {
      mockRequest.session = {
        user: { _id: '123', email: 'test@example.com' }
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await getProfile(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
    });
  });

  describe('logout', () => {
    it('should clear session and logout', () => {
      const destroyMock = jest.fn((cb: (err: any) => void) => cb(null));

      mockRequest.session = {
        user: { _id: '123', email: 'test@example.com' },
        destroy: destroyMock
      };

      logout(mockRequest as any, mockResponse as Response);

      expect(mockRequest.session.user).toBeUndefined();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});
