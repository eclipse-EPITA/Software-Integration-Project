import { editPassword, logout } from '../../controllers/profile.controller';
import { Request, Response } from 'express';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';
import pool from '../../boot/database/db_connect';

// Mock dependencies
jest.mock('../../boot/database/db_connect');
jest.mock('../../middleware/winston');

describe('Profile Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: {},
      session: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('editPassword', () => {
    const validRequest = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
      user: { email: 'user@example.com' }
    };

    it('should update password successfully', async () => {
      mockRequest.body = { oldPassword: validRequest.oldPassword, newPassword: validRequest.newPassword };
      mockRequest.user = { email: validRequest.user.email };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ email: validRequest.user.email }] }) // Verify password
        .mockResolvedValueOnce({ rowCount: 1 }); // Update password

      await editPassword(mockRequest as any, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND password = crypt($2, password);',
        [validRequest.user.email, validRequest.oldPassword]
      );
      expect(pool.query).toHaveBeenCalledWith(
        "UPDATE users SET password = crypt($1, gen_salt('bf')) WHERE email = $2;",
        [validRequest.newPassword, validRequest.user.email]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Password updated' });
    });

    it('should validate required fields', async () => {
      const testCases = [
        { oldPassword: '', newPassword: 'valid', expected: 'Missing parameters' },
        { oldPassword: 'valid', newPassword: '', expected: 'Missing parameters' },
        { oldPassword: 'valid', newPassword: 'valid', user: {}, expected: 'Missing parameters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = { oldPassword: testCase.oldPassword, newPassword: testCase.newPassword };
        mockRequest.user = testCase.user || { email: 'user@example.com' };

        await editPassword(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: testCase.expected });
      }
    });

    it('should validate password not equal', async () => {
      mockRequest.body = { oldPassword: 'same', newPassword: 'same' };
      mockRequest.user = { email: 'user@example.com' };

      await editPassword(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'New password cannot be equal to old password'
      });
    });

    it('should validate password length', async () => {
      mockRequest.body = { oldPassword: 'old', newPassword: 'short' };
      mockRequest.user = { email: 'user@example.com' };

      await editPassword(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'New password must be at least 6 characters long'
      });
    });

    it('should validate old password', async () => {
      mockRequest.body = { oldPassword: 'wrong', newPassword: 'newPassword123' };
      mockRequest.user = { email: 'user@example.com' };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await editPassword(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Incorrect password' });
    });
  });

  describe('logout', () => {
    it('should clear session and logout', () => {
      mockRequest.session = { user: { _id: '123' } };

      logout(mockRequest as any, mockResponse as Response);

      expect(mockRequest.session.user).toBeUndefined();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Disconnected' });
    });

    it('should work even without session', () => {
      mockRequest.session = {};

      logout(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
    });
  });
});