import { vi } from 'vitest';

export class MockIntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[] = [0];
  private readonly callback: IntersectionObserverCallback;
  private observedElement: Element | null = null;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    mockIntersectionObservers.push(this);
  }

  disconnect = vi.fn();

  observe = vi.fn((element: Element) => {
    this.observedElement = element;
  });

  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  unobserve = vi.fn();

  trigger(isIntersecting = true) {
    if (!this.observedElement) {
      throw new Error('Cannot trigger an observer before an element is observed.');
    }

    this.callback([
      {
        boundingClientRect: this.observedElement.getBoundingClientRect(),
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: this.observedElement.getBoundingClientRect(),
        isIntersecting,
        rootBounds: null,
        target: this.observedElement,
        time: 0,
      },
    ], this as unknown as IntersectionObserver);
  }
}

export let mockIntersectionObservers: MockIntersectionObserver[] = [];

export function installMockIntersectionObserver() {
  mockIntersectionObservers = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
}
