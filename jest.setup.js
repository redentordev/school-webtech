// Add custom jest matchers for DOM assertions
import '@testing-library/jest-dom';

// Mock console methods
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Cleanup after tests
afterAll(() => {
  jest.restoreAllMocks();
}); 