import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductPageScrollReset } from '@/components/product/product-page-scroll-reset';

let pathname = '/products/product-one';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

describe('ProductPageScrollReset', () => {
  beforeEach(() => {
    pathname = '/products/product-one';
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('scrolls to the top when the product pathname changes', () => {
    const { rerender } = render(<ProductPageScrollReset />);

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    rerender(<ProductPageScrollReset />);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    pathname = '/products/product-two';
    rerender(<ProductPageScrollReset />);

    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it('does not run outside a product detail pathname', () => {
    pathname = '/products';

    render(<ProductPageScrollReset />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
