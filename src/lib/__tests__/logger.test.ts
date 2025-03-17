import { serverLogger, trackPerformance } from '../logger';
import { ErrorSeverity, ErrorSource } from '../error-utils';

// Mock next/server
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('../__mocks__/next-server-mock');
  return originalModule;
});

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Reset mocks before each test
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
  console.log = originalConsoleLog;
});

describe('serverLogger function', () => {
  it('should log errors with proper format', () => {
    const error = {
      message: 'Test error',
      source: ErrorSource.API,
      severity: ErrorSeverity.ERROR,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    serverLogger(error);
    
    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR][API] Test error'),
      expect.objectContaining(error)
    );
  });
  
  it('should log warnings with proper format', () => {
    const warning = {
      message: 'Test warning',
      source: ErrorSource.VALIDATION,
      severity: ErrorSeverity.WARNING,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    serverLogger(warning);
    
    expect(console.warn).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARNING][VALIDATION] Test warning'),
      expect.objectContaining(warning)
    );
  });
  
  it('should log info messages with proper format', () => {
    const info = {
      message: 'Test info',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    serverLogger(info);
    
    expect(console.info).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO][S3_STORAGE] Test info'),
      expect.objectContaining(info)
    );
  });
  
  it('should add request ID if available', () => {
    // Mock process.requestId
    const originalRequestId = (process as any).requestId;
    (process as any).requestId = 'test-request-id';
    
    const error = {
      message: 'Error with request ID',
      source: ErrorSource.API,
      severity: ErrorSeverity.ERROR,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    serverLogger(error);
    
    // Check that the error was logged with the requestId
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        requestId: 'test-request-id'
      })
    );
    
    // Restore original value
    (process as any).requestId = originalRequestId;
  });
});

describe('trackPerformance function', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should track successful operations', async () => {
    const mockFunction = jest.fn().mockResolvedValue('result');
    
    // Start the operation
    const promise = trackPerformance('test-operation', mockFunction);
    
    // Advance timer to simulate operation taking time
    jest.advanceTimersByTime(100);
    
    // Resolve the promise
    const result = await promise;
    
    // Check the result
    expect(result).toBe('result');
    expect(mockFunction).toHaveBeenCalled();
    
    // Check that success was logged
    expect(console.info).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        message: expect.stringContaining('Operation \'test-operation\' completed'),
        source: ErrorSource.API,
        severity: ErrorSeverity.INFO,
        details: expect.objectContaining({
          operation: 'test-operation',
          duration: expect.any(Number)
        })
      })
    );
  });
  
  it('should track failed operations', async () => {
    const mockError = new Error('Test error');
    const mockFunction = jest.fn().mockRejectedValue(mockError);
    
    // Start the operation
    const promise = trackPerformance('failed-operation', mockFunction);
    
    // Advance timer to simulate operation taking time
    jest.advanceTimersByTime(100);
    
    // Wait for the promise to reject
    await expect(promise).rejects.toThrow('Test error');
    
    // Check that error was logged
    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        message: expect.stringContaining('Operation \'failed-operation\' failed'),
        source: ErrorSource.API,
        severity: ErrorSeverity.ERROR,
        details: expect.objectContaining({
          operation: 'failed-operation',
          duration: expect.any(Number),
          error: mockError
        })
      })
    );
  });
  
  it('should use custom source if provided', async () => {
    const mockFunction = jest.fn().mockResolvedValue('result');
    
    // Start the operation with custom source
    const promise = trackPerformance('custom-source', mockFunction, ErrorSource.DATABASE);
    
    // Advance timer to simulate operation taking time
    jest.advanceTimersByTime(100);
    
    // Resolve the promise
    await promise;
    
    // Check that source was set correctly
    expect(console.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        source: ErrorSource.DATABASE
      })
    );
  });
}); 