import { middleware } from './middleware';
import { NextRequest, NextResponse } from './lib/__mocks__/next-server-mock';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid')
}));

// Mock next/server
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('./lib/__mocks__/next-server-mock');
  return originalModule;
});

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset process.requestId
    if (typeof process !== 'undefined') {
      delete (process as any).requestId;
    }
  });
  
  it('should skip middleware for static files', async () => {
    // Create a mock request for a static file
    const mockRequest = {
      nextUrl: {
        pathname: '/_next/static/file.js'
      }
    } as any; // Using any instead of NextRequest for testing
    
    await middleware(mockRequest);
    
    // Should call NextResponse.next()
    expect(NextResponse.next).toHaveBeenCalled();
    
    // Should not set request ID
    expect((process as any).requestId).toBeUndefined();
  });
  
  it('should process API requests with request ID', async () => {
    // Create a mock request for an API endpoint
    const mockRequest = {
      method: 'POST',
      nextUrl: {
        pathname: '/api/posts/upload-url'
      }
    } as any; // Using any instead of NextRequest for testing
    
    const mockResponse = {
      headers: {
        set: jest.fn()
      }
    };
    
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);
    
    await middleware(mockRequest);
    
    // Should set request ID in process
    expect((process as any).requestId).toBe('test-uuid');
    
    // Should call NextResponse.next()
    expect(NextResponse.next).toHaveBeenCalled();
    
    // Should set request ID header
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Request-ID', 'test-uuid');
    
    // Should set response time header for API routes
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
  });
  
  it('should not add response time header for non-API routes', async () => {
    // Create a mock request for a regular page
    const mockRequest = {
      method: 'GET',
      nextUrl: {
        pathname: '/profile'
      }
    } as any; // Using any instead of NextRequest for testing
    
    const mockResponse = {
      headers: {
        set: jest.fn()
      }
    };
    
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);
    
    await middleware(mockRequest);
    
    // Should set request ID header
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Request-ID', 'test-uuid');
    
    // Should not set response time header for non-API routes
    expect(mockResponse.headers.set).not.toHaveBeenCalledWith(
      'X-Response-Time',
      expect.anything()
    );
  });
}); 