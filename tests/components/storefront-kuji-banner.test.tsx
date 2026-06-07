/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontKujiBanner } from '@/components/home/storefront-kuji-banner';
import { renderWithProviders } from '../test-utils';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} data-priority={priority ? 'true' : undefined} />,
}));

describe('StorefrontKujiBanner', () => {
  it('does not priority-load the below-hero banner image', () => {
    renderWithProviders(<StorefrontKujiBanner />);

    expect(screen.getByAltText('What is Ichiban Kuji banner')).not.toHaveAttribute('data-priority');
  });
});
