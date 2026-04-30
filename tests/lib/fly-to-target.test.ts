import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FLY_TARGET_REQUEST_EVENT,
  flyProductImageToTarget,
} from '@/lib/ui/fly-to-target';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  });
}

function mockAnimationFrame() {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
}

function setRect(element: Element, rect: DOMRect) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
}

describe('flyProductImageToTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockMatchMedia(false);
    mockAnimationFrame();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a decorative image clone and removes it after animation finishes', async () => {
    let finishAnimation = () => {};
    const animateMock = vi.fn().mockReturnValue({
      finished: new Promise<void>((resolve) => {
        finishAnimation = resolve;
      }),
    } as unknown as Animation);
    const revealListener = vi.fn();
    const source = document.createElement('button');
    const target = document.createElement('button');

    Object.defineProperty(HTMLImageElement.prototype, 'animate', {
      configurable: true,
      value: animateMock,
    });
    target.dataset.flyTarget = 'cart';
    document.body.append(source, target);
    setRect(source, new DOMRect(20, 120, 180, 48));
    setRect(target, new DOMRect(320, 16, 40, 40));
    window.addEventListener(FLY_TARGET_REQUEST_EVENT, revealListener);

    flyProductImageToTarget({
      imageAlt: 'Ichiban Figure',
      imageUrl: 'https://example.com/products/figure-1.jpg',
      sourceElement: source,
      target: 'cart',
    });

    const clone = document.body.querySelector('img[aria-hidden="true"]');

    expect(revealListener).toHaveBeenCalledTimes(1);
    expect(clone).toBeInTheDocument();
    expect(clone).toHaveAttribute('src', 'https://example.com/products/figure-1.jpg');
    expect(animateMock).toHaveBeenCalledTimes(1);

    finishAnimation();
    await Promise.resolve();

    expect(document.body.querySelector('img[aria-hidden="true"]')).not.toBeInTheDocument();

    window.removeEventListener(FLY_TARGET_REQUEST_EVENT, revealListener);
  });

  it('skips clone creation for reduced motion', () => {
    mockMatchMedia(true);

    const source = document.createElement('button');
    const target = document.createElement('button');

    target.dataset.flyTarget = 'wishlist';
    document.body.append(source, target);
    setRect(source, new DOMRect(20, 120, 180, 48));
    setRect(target, new DOMRect(320, 16, 40, 40));

    flyProductImageToTarget({
      imageAlt: 'Ichiban Figure',
      imageUrl: 'https://example.com/products/figure-1.jpg',
      sourceElement: source,
      target: 'wishlist',
    });

    expect(document.body.querySelector('img')).not.toBeInTheDocument();
  });

  it('does not throw when the image or target is missing', () => {
    const source = document.createElement('button');

    document.body.append(source);
    setRect(source, new DOMRect(20, 120, 180, 48));

    expect(() => {
      flyProductImageToTarget({
        imageAlt: 'Ichiban Figure',
        imageUrl: null,
        sourceElement: source,
        target: 'cart',
      });
    }).not.toThrow();

    expect(() => {
      flyProductImageToTarget({
        imageAlt: 'Ichiban Figure',
        imageUrl: 'https://example.com/products/figure-1.jpg',
        sourceElement: source,
        target: 'cart',
      });
    }).not.toThrow();

    expect(document.body.querySelector('img')).not.toBeInTheDocument();
  });

  it('cleans up if Web Animations API fails or is unavailable', () => {
    const source = document.createElement('button');
    const target = document.createElement('button');

    target.dataset.flyTarget = 'cart';
    document.body.append(source, target);
    setRect(source, new DOMRect(20, 120, 180, 48));
    setRect(target, new DOMRect(320, 16, 40, 40));
    Object.defineProperty(HTMLImageElement.prototype, 'animate', {
      configurable: true,
      value: vi.fn().mockImplementation(() => {
        throw new Error('animate failed');
      }),
    });

    expect(() => {
      flyProductImageToTarget({
        imageAlt: 'Ichiban Figure',
        imageUrl: 'https://example.com/products/figure-1.jpg',
        sourceElement: source,
        target: 'cart',
      });
    }).not.toThrow();

    expect(document.body.querySelector('img')).not.toBeInTheDocument();

    Object.defineProperty(HTMLImageElement.prototype, 'animate', {
      configurable: true,
      value: undefined,
    });

    expect(() => {
      flyProductImageToTarget({
        imageAlt: 'Ichiban Figure',
        imageUrl: 'https://example.com/products/figure-1.jpg',
        sourceElement: source,
        target: 'cart',
      });
    }).not.toThrow();

    expect(document.body.querySelector('img')).not.toBeInTheDocument();
  });
});
