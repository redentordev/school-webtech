import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { S3Image } from '../S3Image';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, onLoad, onError, ...props }: any) {
    return (
      <img 
        src={src} 
        alt={alt} 
        data-testid="next-image"
        {...props}
        // Simulate image events
        onLoad={onLoad}
        onError={onError}
      />
    );
  }
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ImageIcon: () => <div data-testid="image-icon">ImageIcon</div>,
  Loader2: () => <div data-testid="loader-icon" className="animate-spin">Loader</div>
}));

describe('S3Image Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders image with correct S3 URL', () => {
    const imageKey = 'test/image.jpg';
    render(<S3Image imageKey={imageKey} width={100} height={100} alt="Test image" />);
    
    const imageElement = screen.getByTestId('next-image');
    const expectedUrl = 'https://picwall-webtech.s3.us-east-1.amazonaws.com/test/image.jpg';
    
    expect(imageElement).toHaveAttribute('src', expectedUrl);
    expect(imageElement).toHaveAttribute('alt', 'Test image');
  });

  test('shows loading spinner when image is loading', () => {
    render(<S3Image imageKey="test/image.jpg" width={100} height={100} alt="Loading test" />);
    
    // The loading spinner should be visible initially
    const loadingSpinner = screen.getByTestId('loader-icon');
    expect(loadingSpinner).toBeInTheDocument();
    expect(loadingSpinner).toHaveClass('animate-spin');
  });

  test('hides loading spinner when showLoadingSpinner is false', () => {
    render(
      <S3Image 
        imageKey="test/image.jpg" 
        width={100} 
        height={100} 
        showLoadingSpinner={false} 
        alt="No spinner test" 
      />
    );
    
    // The loading spinner should not be in the document
    const loadingSpinner = screen.queryByTestId('loader-icon');
    expect(loadingSpinner).not.toBeInTheDocument();
  });

  test('shows fallback image when image fails to load', async () => {
    const fallbackSrc = '/fallback.jpg';
    const { rerender } = render(
      <S3Image 
        imageKey="test/error.jpg" 
        fallbackSrc={fallbackSrc} 
        width={100} 
        height={100} 
        alt="Fallback test"
      />
    );
    
    // Get the image and simulate an error
    const imageElement = screen.getByTestId('next-image');
    imageElement.dispatchEvent(new Event('error'));
    
    // Rerender to reflect state update
    rerender(
      <S3Image 
        imageKey="test/error.jpg" 
        fallbackSrc={fallbackSrc} 
        width={100} 
        height={100} 
        alt="Fallback test"
      />
    );
    
    // Now we should see the fallback image
    await waitFor(() => {
      const fallbackImage = screen.getByTestId('next-image');
      expect(fallbackImage).toHaveAttribute('src', fallbackSrc);
    });
    
    // Check if error was logged
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load image with key'));
  });

  test('shows error placeholder when image fails and no fallback', async () => {
    const { rerender } = render(
      <S3Image 
        imageKey="test/error.jpg" 
        width={100} 
        height={100}
        alt="Error test" 
      />
    );
    
    // Get the image and simulate an error
    const imageElement = screen.getByTestId('next-image');
    imageElement.dispatchEvent(new Event('error'));
    
    // Rerender to reflect state update
    rerender(
      <S3Image 
        imageKey="test/error.jpg" 
        width={100} 
        height={100}
        alt="Error test" 
      />
    );
    
    // Now we should see the error placeholder
    await waitFor(() => {
      const errorText = screen.getByText(/Image not available/i);
      expect(errorText).toBeInTheDocument();
      const imageIcon = screen.getByTestId('image-icon');
      expect(imageIcon).toBeInTheDocument();
    });
  });

  test('hides loading spinner when image loads', async () => {
    render(
      <S3Image 
        imageKey="test/image.jpg" 
        width={100} 
        height={100}
        alt="Load test" 
      />
    );
    
    // Get the image and simulate load
    const imageElement = screen.getByTestId('next-image');
    imageElement.dispatchEvent(new Event('load'));
    
    // After load, the spinner should be gone
    await waitFor(() => {
      const loadingSpinner = screen.queryByTestId('loader-icon');
      expect(loadingSpinner).not.toBeInTheDocument();
    });
  });
}); 