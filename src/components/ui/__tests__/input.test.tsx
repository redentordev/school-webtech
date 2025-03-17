import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input Component', () => {
  test('renders input with default props', () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId('test-input');
    
    expect(inputElement).toBeInTheDocument();
    // type attribute will be undefined if not explicitly set
    expect(inputElement.getAttribute('type')).toBeNull();
  });

  test('renders input with specified type', () => {
    render(<Input type="password" data-testid="password-input" />);
    const inputElement = screen.getByTestId('password-input');
    
    expect(inputElement).toHaveAttribute('type', 'password');
  });

  test('applies custom className', () => {
    render(<Input className="custom-class" data-testid="custom-input" />);
    const inputElement = screen.getByTestId('custom-input');
    
    expect(inputElement).toHaveClass('custom-class');
  });

  test('forwards additional props to the input element', () => {
    const placeholder = 'Enter your name';
    render(
      <Input 
        placeholder={placeholder}
        data-testid="test-input"
        disabled 
      />
    );
    
    const inputElement = screen.getByTestId('test-input');
    
    expect(inputElement).toBeDisabled();
    expect(inputElement).toHaveAttribute('placeholder', placeholder);
  });

  test('handles user input correctly', async () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input-with-change" />);
    
    const inputElement = screen.getByTestId('input-with-change');
    await userEvent.type(inputElement, 'Hello, world!');
    
    expect(handleChange).toHaveBeenCalledTimes(13); // One call per character
    expect(inputElement).toHaveValue('Hello, world!');
  });

  test('forwards ref to the input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="ref-input" />);
    
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('INPUT');
  });
}); 