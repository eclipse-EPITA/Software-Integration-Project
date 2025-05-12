// src/__tests__/controllers/messages.controller.test.ts
import {
  getMessages,
  getMessageById,
  addMessage,
  editMessage,
  deleteMessage
} from '../../controllers/messages.controller';
import { Request, Response } from 'express';
import MessageModel from '../../models/messageModel';
import { statusCodes } from '../../constants/statusCodes';
import logger from '../../middleware/winston';

// Mock dependencies
jest.mock('../../models/messageModel');
jest.mock('../../middleware/winston');

describe('Messages Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      session: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getMessages', () => {
    it('should fetch all messages successfully', async () => {
      const mockMessages = [
        { name: 'Message 1', content: 'Content 1' },
        { name: 'Message 2', content: 'Content 2' }
      ];
      (MessageModel.find as jest.Mock).mockResolvedValue(mockMessages);

      await getMessages(mockRequest as any, mockResponse as Response);

      expect(MessageModel.find).toHaveBeenCalledWith({});
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMessages);
    });

    it('should handle database errors', async () => {
      (MessageModel.find as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await getMessages(mockRequest as any, mockResponse as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.queryError);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Error while getting messages'
      });
    });
  });

  describe('getMessageById', () => {
    it('should fetch a message by ID', async () => {
      const mockMessage = { _id: '123', name: 'Test Message' };
      mockRequest.params = { messageId: '123' };
      (MessageModel.findById as jest.Mock).mockResolvedValue(mockMessage);

      await getMessageById(mockRequest as any, mockResponse as Response);

      expect(MessageModel.findById).toHaveBeenCalledWith('123');
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMessage);
    });

    it('should reject missing message ID', async () => {
      mockRequest.params = {};

      await getMessageById(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Message ID is required'
      });
    });

    it('should handle message not found', async () => {
      mockRequest.params = { messageId: '123' };
      (MessageModel.findById as jest.Mock).mockResolvedValue(null);

      await getMessageById(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Message not found'
      });
    });
  });

  describe('addMessage', () => {
    const validMessage = {
      message: {
        name: 'Valid Message',
        content: 'This is a valid message content that meets all requirements.'
      }
    };

    it('should add a new message successfully', async () => {
      mockRequest.body = validMessage;
      mockRequest.session = { user: { _id: 'user123' } };
      const mockSavedMessage = { ...validMessage.message, _id: 'new123' };
      (MessageModel.prototype.save as jest.Mock).mockResolvedValue(mockSavedMessage);

      await addMessage(mockRequest as any, mockResponse as Response);

      expect(MessageModel.prototype.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSavedMessage);
    });

    it('should reject unauthorized requests', async () => {
      mockRequest.body = validMessage;
      mockRequest.session = {};

      await addMessage(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.unauthorized);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'You are not authenticated'
      });
    });

    it('should validate message name length', async () => {
      const testCases = [
        { name: 'ab', expected: 'Message name must be between 3 and 100 characters' },
        { name: 'a'.repeat(101), expected: 'Message name must be between 3 and 100 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = {
          message: { ...validMessage.message, name: testCase.name }
        };
        mockRequest.session = { user: { _id: 'user123' } };

        await addMessage(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate message content length', async () => {
      const testCases = [
        { content: 'short', expected: 'Message content must be between 10 and 1000 characters' },
        { content: 'a'.repeat(1001), expected: 'Message content must be between 10 and 1000 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = {
          message: { ...validMessage.message, content: testCase.content }
        };
        mockRequest.session = { user: { _id: 'user123' } };

        await addMessage(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });
  });

  describe('editMessage', () => {
    it('should update a message successfully', async () => {
      mockRequest.params = { messageId: '123' };
      mockRequest.body = { name: 'Updated Name' };
      const mockUpdatedMessage = { _id: '123', name: 'Updated Name' };
      (MessageModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedMessage);

      await editMessage(mockRequest as any, mockResponse as Response);

      expect(MessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { name: 'Updated Name' },
        { new: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedMessage);
    });

    it('should validate required fields', async () => {
      const testCases = [
        { messageId: '', name: 'Test', expected: 'Message name and ID are required' },
        { messageId: '123', name: '', expected: 'Message name and ID are required' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { messageId: testCase.messageId };
        mockRequest.body = { name: testCase.name };

        await editMessage(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });

    it('should validate name length', async () => {
      const testCases = [
        { name: 'ab', expected: 'Message name must be between 3 and 100 characters' },
        { name: 'a'.repeat(101), expected: 'Message name must be between 3 and 100 characters' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { messageId: '123' };
        mockRequest.body = { name: testCase.name };

        await editMessage(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: testCase.expected });
      }
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message successfully', async () => {
      mockRequest.params = { messageId: '123' };
      const mockDeletedMessage = { _id: '123', name: 'Deleted Message' };
      (MessageModel.findByIdAndDelete as jest.Mock).mockResolvedValue(mockDeletedMessage);

      await deleteMessage(mockRequest as any, mockResponse as Response);

      expect(MessageModel.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.success);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Message deleted' });
    });

    it('should handle message not found', async () => {
      mockRequest.params = { messageId: '123' };
      (MessageModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await deleteMessage(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.notFound);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Message not found' });
    });

    it('should reject missing message ID', async () => {
      mockRequest.params = {};

      await deleteMessage(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(statusCodes.badRequest);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Message ID is required'
      });
    });
  });
});