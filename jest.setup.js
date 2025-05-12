// jest.setup.js
jest.mock('winston', () => {
  const originalModule = jest.requireActual('winston');
  return {
    ...originalModule,
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
    format: {
      ...originalModule.format,
      combine: jest.fn(),
      timestamp: jest.fn(),
      simple: jest.fn(),
    },
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      add: jest.fn(),
      clear: jest.fn(),
      transports: [],
    }),
  };
});
console.log('Jest setup running');