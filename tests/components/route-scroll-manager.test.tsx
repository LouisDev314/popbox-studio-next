import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RouteScrollManager,
  getRouteScrollTarget,
} from '@/components/navigation/route-scroll-manager';

let pathname = '/products';
const originalDocumentScroller = Object.getOwnPropertyDescriptor(document, 'scrollingElement');
const originalDocumentScrollTo = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollTo');
const originalScrollRestoration = Object.getOwnPropertyDescriptor(window.history, 'scrollRestoration');

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

function setDocumentScroller(scroller: Element | null) {
  Object.defineProperty(document, 'scrollingElement', {
    configurable: true,
    value: scroller,
  });
}

describe('RouteScrollManager', () => {
  beforeEach(() => {
    pathname = '/products';
    window.history.replaceState({}, '', pathname);
    document.body.innerHTML = '';
    setDocumentScroller(null);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalDocumentScroller) {
      Object.defineProperty(document, 'scrollingElement', originalDocumentScroller);
    } else {
      delete (document as Document & { scrollingElement?: Element | null }).scrollingElement;
    }

    if (originalDocumentScrollTo) {
      Object.defineProperty(document.documentElement, 'scrollTo', originalDocumentScrollTo);
    } else {
      delete (document.documentElement as HTMLElement & { scrollTo?: HTMLElement['scrollTo'] }).scrollTo;
    }

    if (originalScrollRestoration) {
      Object.defineProperty(window.history, 'scrollRestoration', originalScrollRestoration);
    } else {
      delete (window.history as History & { scrollRestoration?: ScrollRestoration }).scrollRestoration;
    }
  });

  it('does not reset the initial render', () => {
    render(<RouteScrollManager />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('resets exactly once when the pathname changes', () => {
    const { rerender } = render(<RouteScrollManager />);

    pathname = '/about';
    window.history.replaceState({}, '', pathname);
    rerender(<RouteScrollManager />);

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    rerender(<RouteScrollManager />);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not reset for a query-only change', () => {
    const { rerender } = render(<RouteScrollManager />);

    window.history.replaceState({}, '', '/products?sort=price_asc');
    rerender(<RouteScrollManager />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('leaves cross-page hash navigation to Next.js and the browser', () => {
    const { rerender } = render(<RouteScrollManager />);

    pathname = '/contact';
    window.history.replaceState({}, '', '/contact#contact-form');
    rerender(<RouteScrollManager />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('resets an explicitly marked nested route scroll container', () => {
    const nestedScrollTo = vi.fn();
    const container = document.createElement('main');
    container.dataset.routeScrollContainer = '';
    container.scrollTo = nestedScrollTo;
    document.body.appendChild(container);
    const { rerender } = render(<RouteScrollManager />);

    pathname = '/about';
    window.history.replaceState({}, '', pathname);
    rerender(<RouteScrollManager />);

    expect(getRouteScrollTarget()).toBe(container);
    expect(nestedScrollTo).toHaveBeenCalledTimes(1);
    expect(nestedScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('uses the standards-mode document scrolling element when available', () => {
    const documentScrollTo = vi.fn();
    document.documentElement.scrollTo = documentScrollTo;
    setDocumentScroller(document.documentElement);
    const { rerender } = render(<RouteScrollManager />);

    pathname = '/about';
    window.history.replaceState({}, '', pathname);
    rerender(<RouteScrollManager />);

    expect(getRouteScrollTarget()).toBe(document.documentElement);
    expect(documentScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('preserves native restoration for Back and Forward pathname changes', () => {
    const { rerender } = render(<RouteScrollManager />);

    act(() => {
      window.history.replaceState({}, '', '/about');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    pathname = '/about';
    rerender(<RouteScrollManager />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('cleans up its popstate listener without scheduling animation frames', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame');
    const { unmount } = render(<RouteScrollManager />);
    const popstateListener = addEventListener.mock.calls.find(([type]) => type === 'popstate')?.[1];

    unmount();

    expect(popstateListener).toBeTypeOf('function');
    expect(removeEventListener).toHaveBeenCalledWith('popstate', popstateListener);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('does not create a duplicate visible reset in Strict Mode', () => {
    const { rerender } = render(
      <StrictMode>
        <RouteScrollManager />
      </StrictMode>,
    );

    pathname = '/about';
    window.history.replaceState({}, '', pathname);
    rerender(
      <StrictMode>
        <RouteScrollManager />
      </StrictMode>,
    );

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not take ownership of history.scrollRestoration', () => {
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      value: 'auto',
      writable: true,
    });

    const { unmount } = render(<RouteScrollManager />);
    unmount();

    expect(window.history.scrollRestoration).toBe('auto');
  });
});
