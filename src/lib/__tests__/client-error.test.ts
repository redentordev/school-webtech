/**
 * @jest-environment jsdom
 */

import { reportErrorToServer, withErrorHandling } from '../client-error';
import { ErrorSource } from '../error-utils';

// Mock next/server
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('../__mocks__/next-server-mock');
  return originalModule;
});

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  console.error = jest.fn();
  
  // Mock environment variables
  Object.defineProperty(process, 'env', {
    value: {
      NODE_ENV: 'production'
    },
    writable: true
  });
  
  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'https://example.com/test'
    },
    writable: true
  });
  
  // Mock navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'jest-test-agent'
    },
    writable: true
  });
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
});

describe('reportErrorToServer function', () => {
  it('should send error to server in production', async () => {
    const error = {
      message: 'Test client error',
      source: ErrorSource.CLIENT,
      timestamp: new Date(),
      details: { test: 'details' }
    };
    
    // Mock fetch to resolve
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    await reportErrorToServer(error);
    
    // Check that fetch was called with the right arguments
    expect(global.fetch).toHaveBeenCalledWith('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String)
    });
    
    // Check body content
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({
      message: 'Test client error',
      source: ErrorSource.CLIENT,
      details: { test: 'details' },
      clientTimestamp: expect.any(String),
      url: 'https://example.com/test',
      userAgent: 'jest-test-agent'
    });
  });
  
  it('should not send error to server in development', async () => {
    // Set environment to development
    Object.defineProperty(process, 'env', {
      value: {
        NODE_ENV: 'development'
      },
      writable: true
    });
    
    const error = {
      message: 'Test dev error',
      source: ErrorSource.CLIENT,
      timestamp: new Date()
    };
    
    await reportErrorToServer(error);
    
    // Check that fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Check that error was logged to console
    expect(console.error).toHaveBeenCalledWith('[Client Error]', error);
  });
  
  it('should handle fetch errors gracefully', async () => {
    const error = {
      message: 'Test error with fetch failure',
      source: ErrorSource.CLIENT,
      timestamp: new Date()
    };
    
    // Mock fetch to reject
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    await reportErrorToServer(error);
    
    // Should log the error but not throw
    expect(console.error).toHaveBeenCalledWith(
      'Failed to report error to server:',
      expect.any(Error)
    );
  });
});

describe('withErrorHandling function', () => {
  it('should pass through successful operations', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const wrappedFunction = withErrorHandling(mockFunction);
    
    const result = await wrappedFunction('arg1', 'arg2');
    
    // Check result
    expect(result).toBe('success');
    
    // Check that original function was called with arguments
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    
    // Check that no errors were reported
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should handle and report errors', async () => {
    const mockError = new Error('Test error in wrapped function');
    const mockFunction = jest.fn().mockRejectedValue(mockError);
    const wrappedFunction = withErrorHandling(mockFunction);
    
    // Mock fetch to resolve
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    // Function should still throw
    await expect(wrappedFunction('arg1')).rejects.toThrow('Test error in wrapped function');
    
    // But error should be reported
    expect(global.fetch).toHaveBeenCalled();
    
    // Check body content
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({
      message: 'Test error in wrapped function',
      source: ErrorSource.CLIENT
    });
  });
  
  it('should call custom error handler if provided', async () => {
    const mockError = new Error('Custom handler test');
    const mockFunction = jest.fn().mockRejectedValue(mockError);
    const customHandler = jest.fn();
    
    const wrappedFunction = withErrorHandling(mockFunction, customHandler);
    
    // Function should throw
    await expect(wrappedFunction()).rejects.toThrow('Custom handler test');
    
    // Custom handler should be called
    expect(customHandler).toHaveBeenCalledWith(mockError);
  });
}); 