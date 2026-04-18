import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoreFooter } from '@/components/layout/store-footer';
import { renderWithProviders } from '../test-utils';

describe('StoreFooter', () => {
  it('renders social media links beneath the brand copy', () => {
    renderWithProviders(<StoreFooter />);

    expect(screen.getByRole('link', { name: 'Follow PopBox Studio on TikTok' })).toHaveAttribute('href', 'https://www.tiktok.com/@popbox_studio');
    expect(screen.getByRole('link', { name: 'Follow PopBox Studio on Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/popbox_studio/');
    expect(screen.getByRole('link', { name: 'Follow PopBox Studio on Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/p/PopBox-Studio-61574809973184/');
  });
});
