import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button Component', () => {
  test('renders button with default props', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('bg-primary');
  });

  test('renders button with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    let buttonElement = screen.getByRole('button', { name: /destructive/i });
    
    expect(buttonElement).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    buttonElement = screen.getByRole('button', { name: /outline/i });
    
    expect(buttonElement).toHaveClass('border-input');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    buttonElement = screen.getByRole('button', { name: /secondary/i });
    
    expect(buttonElement).toHaveClass('bg-secondary');
  });

  test('renders button with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let buttonElement = screen.getByRole('button', { name: /small/i });
    
    expect(buttonElement).toHaveClass('h-8');
    
    rerender(<Button size="lg">Large</Button>);
    buttonElement = screen.getByRole('button', { name: /large/i });
    
    expect(buttonElement).toHaveClass('h-10');
    
    rerender(<Button size="icon">🔍</Button>);
    buttonElement = screen.getByRole('button', { name: /🔍/i });
    
    expect(buttonElement).toHaveClass('w-9');
  });

  test('renders as a different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/">Link Button</a>
      </Button>
    );
    
    const linkElement = screen.getByRole('link', { name: /link button/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/');
    expect(linkElement).toHaveClass('bg-primary');
  });

  test('forwards additional props to the button element', () => {
    render(<Button data-testid="test-button" disabled>Disabled</Button>);
    const buttonElement = screen.getByTestId('test-button');
    
    expect(buttonElement).toBeDisabled();
  });

  test('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(buttonElement);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
}); 