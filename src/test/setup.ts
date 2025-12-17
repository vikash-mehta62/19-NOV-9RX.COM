// Test setup file for vitest
import { beforeAll, afterEach, afterAll } from 'vitest';

// Mock environment variables
beforeAll(() => {
  // Set up any global test configuration
  process.env.NODE_ENV = 'test';
});

// Clean up after each test
afterEach(() => {
  // Reset any global state if needed
});

// Clean up after all tests
afterAll(() => {
  // Final cleanup
});