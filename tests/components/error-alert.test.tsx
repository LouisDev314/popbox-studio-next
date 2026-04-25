import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorAlert } from '@/components/ui/error-alert';

describe('ErrorAlert', () => {
  it('renders a destructive alert with the standard title and message', () => {
    render(<ErrorAlert message="Unable to save changes." />);

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('Unable to save changes.');
  });

  it('renders nothing for an empty message', () => {
    const { container } = render(<ErrorAlert message="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
