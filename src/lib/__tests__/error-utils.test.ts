// Mock modules before importing anything
jest.mock('../logger', () => {
  return {
    serverLogger: jest.fn()
  };
});

jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn().mockImplementation((body, options) => ({
        body,
        status: options?.status || 200
      }))
    }
  };
});

import { 
  ErrorSeverity,
  ErrorSource,
  logError,
  createErrorResponse,
  handleS3Error,
  handleMongoDBError,
  handleAuthError
} from '../error-utils';
import { serverLogger } from '../logger';
import { NextResponse } from 'next/server';

// Import our mocks explicitly to type assertions
const mockServerLogger = serverLogger as jest.Mock;
const mockNextResponseJson = NextResponse.json as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('logError function', () => {
  it('should call serverLogger for ERROR severity', () => {
    const error = {
      message: 'Test error',
      source: ErrorSource.API,
      severity: ErrorSeverity.ERROR,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    logError(error);
    
    expect(mockServerLogger).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test error',
      source: ErrorSource.API,
      severity: ErrorSeverity.ERROR
    }));
  });
  
  it('should call serverLogger for WARNING severity', () => {
    const error = {
      message: 'Test warning',
      source: ErrorSource.VALIDATION,
      severity: ErrorSeverity.WARNING,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    logError(error);
    
    expect(mockServerLogger).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test warning',
      source: ErrorSource.VALIDATION,
      severity: ErrorSeverity.WARNING
    }));
  });
  
  it('should call serverLogger for INFO severity', () => {
    const error = {
      message: 'Test info',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO,
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    logError(error);
    
    expect(mockServerLogger).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test info',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO
    }));
  });
  
  it('should use timestamp if not provided', () => {
    const error = {
      message: 'Test error no timestamp',
      source: ErrorSource.API,
      severity: ErrorSeverity.ERROR
    } as any; // TypeScript would normally require timestamp, but we're testing the fallback
    
    logError(error);
    
    expect(mockServerLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String)
      })
    );
  });
});

describe('createErrorResponse function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create error response from string', () => {
    const result = createErrorResponse('Error message', 400);
    
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: { message: 'Error message', code: undefined, source: ErrorSource.API } },
      { status: 400 }
    );
  });
  
  it('should create error response from Error object', () => {
    const error = new Error('Some error');
    const result = createErrorResponse(error, 500);
    
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: { message: 'Some error', code: undefined, source: ErrorSource.API } },
      { status: 500 }
    );
  });
  
  it('should create error response from AppError object', () => {
    const appError = {
      message: 'App error',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.CRITICAL,
      code: 'DB_ERROR',
      timestamp: '2023-01-01T00:00:00.000Z'
    };
    
    const result = createErrorResponse(appError, 500);
    
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: { message: 'App error', code: 'DB_ERROR', source: ErrorSource.DATABASE } },
      { status: 500 }
    );
  });
  
  it('should use default status code if not provided', () => {
    const result = createErrorResponse('Default status');
    
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.any(Object),
      { status: 500 } // Default status is 500
    );
  });
  
  it('should add requestId if available in process', () => {
    // Mock process.requestId
    const originalRequestId = (process as any).requestId;
    (process as any).requestId = 'test-request-id';
    
    createErrorResponse('Error with request ID');
    
    // Verify serverLogger was called with the requestId
    expect(mockServerLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id'
      })
    );
    
    // Restore original value
    (process as any).requestId = originalRequestId;
  });
});

describe('handleS3Error function', () => {
  it('should handle NoSuchKey error', () => {
    const error = { name: 'NoSuchKey', message: 'The key does not exist' };
    const result = handleS3Error(error, 'getObject');
    
    expect(result).toEqual({
      message: 'File not found in S3: getObject',
      code: 'S3_FILE_NOT_FOUND',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'NoSuchKey',
        errorMessage: 'The key does not exist'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle AccessDenied error', () => {
    const error = { name: 'AccessDenied', message: 'Access Denied' };
    const result = handleS3Error(error, 'putObject');
    
    expect(result).toEqual({
      message: 'Access denied to S3 resource: putObject',
      code: 'S3_ACCESS_DENIED',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.ERROR,
      details: expect.objectContaining({
        errorName: 'AccessDenied',
        errorMessage: 'Access Denied'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle network error', () => {
    const error = { name: 'NetworkError', message: 'Network Error', $metadata: { httpStatusCode: 0 } };
    const result = handleS3Error(error, 'upload');
    
    expect(result).toEqual({
      message: 'Network error during S3 operation: upload',
      code: 'S3_NETWORK_ERROR',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.CRITICAL,
      details: expect.objectContaining({
        errorName: 'NetworkError',
        errorMessage: 'Network Error',
        metadata: { httpStatusCode: 0 }
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle credentials error', () => {
    const error = { name: 'CredentialsError', message: 'Invalid credentials' };
    const result = handleS3Error(error, 'auth');
    
    expect(result).toEqual({
      message: 'S3 credentials error: auth',
      code: 'S3_CREDENTIALS_ERROR',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.CRITICAL,
      details: expect.objectContaining({
        errorName: 'CredentialsError',
        errorMessage: 'Invalid credentials'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle unknown S3 errors', () => {
    const error = { name: 'UnknownError', message: 'Unknown error', code: 'UNKNOWN' };
    const result = handleS3Error(error, 'unknown');
    
    expect(result).toEqual({
      message: 'S3 operation failed: unknown',
      code: 'UNKNOWN',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.ERROR,
      details: expect.objectContaining({
        errorName: 'UnknownError',
        errorMessage: 'Unknown error',
        errorCode: 'UNKNOWN'
      }),
      timestamp: expect.any(String)
    });
  });
});

describe('handleMongoDBError function', () => {
  it('should handle duplicate key error', () => {
    const error = { name: 'MongoError', code: 11000, message: 'Duplicate key error' };
    const result = handleMongoDBError(error, 'createUser');
    
    expect(result).toEqual({
      message: 'Duplicate key error: createUser',
      code: 'DB_DUPLICATE_KEY',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'MongoError',
        errorMessage: 'Duplicate key error',
        errorCode: 11000
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle validation error', () => {
    const error = { name: 'ValidationError', message: 'Validation failed' };
    const result = handleMongoDBError(error, 'updateUser');
    
    expect(result).toEqual({
      message: 'Database validation error: updateUser',
      code: 'DB_VALIDATION_ERROR',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'ValidationError',
        errorMessage: 'Validation failed'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle cast error', () => {
    const error = { name: 'CastError', message: 'Cast failed' };
    const result = handleMongoDBError(error, 'findUser');
    
    expect(result).toEqual({
      message: 'Database cast error: findUser',
      code: 'DB_CAST_ERROR',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'CastError',
        errorMessage: 'Cast failed'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle connection error', () => {
    const error = { name: 'ConnectionError', message: 'connect ECONNREFUSED' };
    const result = handleMongoDBError(error, 'connect');
    
    expect(result).toEqual({
      message: 'Database connection error: connect',
      code: 'DB_CONNECTION_ERROR',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.CRITICAL,
      details: expect.objectContaining({
        errorName: 'ConnectionError',
        errorMessage: 'connect ECONNREFUSED'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle unknown database errors', () => {
    const error = { name: 'UnknownError', message: 'Unknown error' };
    const result = handleMongoDBError(error, 'unknown');
    
    expect(result).toEqual({
      message: 'Database operation failed: unknown',
      code: 'UNKNOWN_DB_ERROR',
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.ERROR,
      details: expect.objectContaining({
        errorName: 'UnknownError',
        errorMessage: 'Unknown error'
      }),
      timestamp: expect.any(String)
    });
  });
});

describe('handleAuthError function', () => {
  it('should handle invalid credentials error', () => {
    const error = { name: 'AuthError', message: 'Invalid credentials' };
    const result = handleAuthError(error, 'login');
    
    expect(result).toEqual({
      message: 'Invalid login credentials: login',
      code: 'AUTH_INVALID_CREDENTIALS',
      source: ErrorSource.AUTH,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'AuthError',
        errorMessage: 'Invalid credentials'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle token error', () => {
    const error = { name: 'TokenError', message: 'Invalid token' };
    const result = handleAuthError(error, 'validateToken');
    
    expect(result).toEqual({
      message: 'Invalid or expired token: validateToken',
      code: 'AUTH_INVALID_TOKEN',
      source: ErrorSource.AUTH,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'TokenError',
        errorMessage: 'Invalid token'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle OAuth account not linked error', () => {
    const error = { name: 'OAuthError', message: 'OAuthAccountNotLinked' };
    const result = handleAuthError(error, 'oauth');
    
    expect(result).toEqual({
      message: 'OAuth account not linked: oauth',
      code: 'AUTH_OAUTH_NOT_LINKED',
      source: ErrorSource.AUTH,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'OAuthError',
        errorMessage: 'OAuthAccountNotLinked'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle user not found error', () => {
    const error = { name: 'UserError', message: 'User not found' };
    const result = handleAuthError(error, 'findUser');
    
    expect(result).toEqual({
      message: 'User not found: findUser',
      code: 'AUTH_USER_NOT_FOUND',
      source: ErrorSource.AUTH,
      severity: ErrorSeverity.WARNING,
      details: expect.objectContaining({
        errorName: 'UserError',
        errorMessage: 'User not found'
      }),
      timestamp: expect.any(String)
    });
  });
  
  it('should handle unknown auth errors', () => {
    const error = { name: 'UnknownError', message: 'Unknown error' };
    const result = handleAuthError(error, 'unknown');
    
    expect(result).toEqual({
      message: 'Authentication error: unknown',
      code: 'AUTH_ERROR',
      source: ErrorSource.AUTH,
      severity: ErrorSeverity.ERROR,
      details: expect.objectContaining({
        errorName: 'UnknownError',
        errorMessage: 'Unknown error'
      }),
      timestamp: expect.any(String)
    });
  });
}); 