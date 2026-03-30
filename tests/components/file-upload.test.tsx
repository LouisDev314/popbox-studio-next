import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUpload } from '@/components/ui/file-upload';
import { renderWithProviders } from '../test-utils';

describe('FileUpload', () => {
  it('passes accepted image files through to the caller', async () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(
      <FileUpload onChange={onChange} accept="image/*" maxSizeBytes={1024} />,
    );

    const input = container.querySelector('input[type="file"]');
    const file = new File([new Uint8Array(100)], 'product.png', { type: 'image/png' });

    expect(input).toHaveAttribute('accept', 'image/*');

    await userEvent.upload(input as HTMLInputElement, file);

    expect(onChange).toHaveBeenCalledWith([file]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects oversized files before upload', async () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(
      <FileUpload onChange={onChange} accept="image/*" maxSizeBytes={1024} />,
    );

    const input = container.querySelector('input[type="file"]');
    const file = new File([new Uint8Array(2048)], 'product.png', { type: 'image/png' });

    await userEvent.upload(input as HTMLInputElement, file);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('product.png must be 1 KB or smaller.');
  });
});
