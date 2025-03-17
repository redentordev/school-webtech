'use client';

import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';

// Error types that match server-side errors
export enum ErrorSource {
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  S3_STORAGE = 'S3_STORAGE',
  API = 'API',
  CLIENT = 'CLIENT',
  VALIDATION = 'VALIDATION',
}

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// Client-side error structure
export interface ClientError {
  message: string;
  source: ErrorSource;
  code?: string;
  timestamp: Date;
  details?: any;
}

interface ErrorContextType {
  error: ClientError | null;
  setError: (error: ClientError | null) => void;
  clearError: () => void;
  logError: (error: Error | unknown, source?: ErrorSource) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ClientError | null>(null);

  const clearError = () => {
    setError(null);
  };

  // Function to log errors to console and set them in state
  const logError = (errorObj: Error | unknown, source: ErrorSource = ErrorSource.CLIENT) => {
    // Format the error
    let formattedError: ClientError;

    if (errorObj instanceof Error) {
      formattedError = {
        message: errorObj.message || 'An unexpected error occurred',
        source,
        code: (errorObj as any).code,
        timestamp: new Date(),
        details: {
          name: errorObj.name,
          stack: errorObj.stack,
        },
      };
    } else if (typeof errorObj === 'string') {
      formattedError = {
        message: errorObj,
        source,
        timestamp: new Date(),
      };
    } else {
      // Handle unknown error types
      formattedError = {
        message: 'An unknown error occurred',
        source,
        timestamp: new Date(),
        details: errorObj,
      };
    }

    // Log to console based on severity
    console.error(`[${source}] ${formattedError.message}`, formattedError);
    
    // Update state with the error
    setError(formattedError);
    
    // Optional: Send error to analytics service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: send to a hypothetical error tracking service
      // errorTrackingService.captureError(formattedError);
    }
  };

  return (
    <ErrorContext.Provider value={{ error, setError, clearError, logError }}>
      {children}
    </ErrorContext.Provider>
  );
}

// Custom hook to use the error context
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Create a simplified ErrorBoundary component
type FallbackRenderProp = (error: ClientError) => ReactElement;

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: React.ComponentType<{ error: ClientError }>;
  fallbackRender?: FallbackRenderProp;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ClientError | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: {
        message: error.message || 'An unexpected error occurred',
        source: ErrorSource.CLIENT,
        timestamp: new Date(),
        details: {
          name: error.name,
          stack: error.stack,
        },
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    const { children, FallbackComponent, fallbackRender } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (fallbackRender) {
        return fallbackRender(error);
      }
      
      if (FallbackComponent) {
        return <FallbackComponent error={error} />;
      }
      
      // Default fallback UI
      return (
        <div className="error-boundary p-4 m-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-red-700 font-bold">Something went wrong</h2>
          <p className="text-red-600 my-2">{error.message}</p>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
} 