// src/__tests__/middleware/winston.test.ts
import logger, { stream, logRequest, logError } from '../../middleware/winston';
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

describe('Winston Logger', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Mock winston transports
    logger.transports.forEach((transport) => {
      if (transport.close) transport.close();
    });
    logger.clear();

    // Add mock transport for testing
    logger.add(new winston.transports.Console({
      silent: true // Silence output during tests
    }));

    // Setup Express mock objects
    mockRequest = {
      method: 'GET',
      url: '/test'
    };
    mockResponse = {
      statusCode: 200,
      on: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Configuration', () => {
    it('should have the correct log level', () => {
      expect(logger.level).toBe('info');
    });

    it('should have file transports', () => {
      const hasFileTransport = logger.transports.some(
        transport => transport instanceof winston.transports.File
      );
      expect(hasFileTransport).toBeTruthy();
    });
  });

  describe('Stream', () => {
    it('should log messages with info level', () => {
      const spy = jest.spyOn(logger, 'info');
      const testMessage = 'Test stream message';
      
      stream.write(testMessage);
      
      expect(spy).toHaveBeenCalledWith(testMessage.trim());
    });
  });

  describe('logRequest', () => {
    it('should log request details', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logRequest(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
      
      // Trigger the finish event
      (mockResponse.on as jest.Mock).mock.calls[0][1]();
      
      expect(spy).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        status: 200,
        duration: expect.stringMatching(/\d+ms/)
      });
    });
  });

  describe('logError', () => {
    it('should log Error objects with stack trace', () => {
      const spy = jest.spyOn(logger, 'error');
      const testError = new Error('Test error');
      
      logError(testError);
      
      expect(spy).toHaveBeenCalledWith({
        message: 'Test error',
        stack: testError.stack
      });
    });

    it('should log non-Error objects directly', () => {
      const spy = jest.spyOn(logger, 'error');
      const testError = { custom: 'error' };
      
      logError(testError as unknown as Error);
      
      expect(spy).toHaveBeenCalledWith(testError);
    });
  });

  describe('Logger Methods', () => {
    it('should log info messages', () => {
      const spy = jest.spyOn(logger, 'info');
      const testMessage = 'Test info message';
      
      logger.info(testMessage);
      
      expect(spy).toHaveBeenCalledWith(testMessage);
    });

    it('should log error messages', () => {
      const spy = jest.spyOn(logger, 'error');
      const testMessage = 'Test error message';
      
      logger.error(testMessage);
      
      expect(spy).toHaveBeenCalledWith(testMessage);
    });
  });
});