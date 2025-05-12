import '@types/jest';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMongoId(): R;
    }
  }

  // Declare Jest globals
  const describe: typeof import('@jest/globals')['describe'];
  const beforeAll: typeof import('@jest/globals')['beforeAll'];
  const afterAll: typeof import('@jest/globals')['afterAll'];
  const beforeEach: typeof import('@jest/globals')['beforeEach'];
  const afterEach: typeof import('@jest/globals')['afterEach'];
  const it: typeof import('@jest/globals')['it'];
  const expect: typeof import('@jest/globals')['expect'];
  const jest: typeof import('@jest/globals')['jest'];
}

export {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
}; 