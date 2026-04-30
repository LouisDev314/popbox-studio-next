export type TFlyProductTarget = 'cart' | 'wishlist';

export const FLY_TARGET_REQUEST_EVENT = 'popbox:fly-target-request';

const FLY_IMAGE_SIZE = 56;
const FLY_ANIMATION_MS = 650;
const TARGET_REVEAL_FRAME_DELAY = 2;

interface IFlyProductImageToTargetOptions {
  imageAlt: string;
  imageUrl?: string | null;
  sourceElement?: Element | null;
  sourceRect?: DOMRect | null;
  target: TFlyProductTarget;
}

function shouldSkipMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isUsableRect(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0;
}

function getTargetElement(target: TFlyProductTarget) {
  const targetElement = document.querySelector(`[data-fly-target="${target}"]`);

  if (!(targetElement instanceof HTMLElement)) {
    return null;
  }

  const targetRect = targetElement.getBoundingClientRect();

  if (!isUsableRect(targetRect)) {
    return null;
  }

  return {
    element: targetElement,
    rect: targetRect,
  };
}

function getSourceRect(options: IFlyProductImageToTargetOptions) {
  if (options.sourceRect && isUsableRect(options.sourceRect)) {
    return options.sourceRect;
  }

  if (!options.sourceElement) {
    return null;
  }

  const sourceRect = options.sourceElement.getBoundingClientRect();

  return isUsableRect(sourceRect) ? sourceRect : null;
}

function waitForAnimationFrame(count: number, callback: () => void) {
  if (count <= 0) {
    callback();
    return;
  }

  window.requestAnimationFrame(() => waitForAnimationFrame(count - 1, callback));
}

function removeClone(clone: HTMLImageElement) {
  clone.remove();
}

function runFlyAnimation(options: IFlyProductImageToTargetOptions) {
  const sourceRect = getSourceRect(options);

  if (!sourceRect) {
    return;
  }

  window.dispatchEvent(new CustomEvent(FLY_TARGET_REQUEST_EVENT));

  waitForAnimationFrame(TARGET_REVEAL_FRAME_DELAY, () => {
    const target = getTargetElement(options.target);

    if (!target) {
      return;
    }

    const clone = document.createElement('img');
    const startX = sourceRect.left + sourceRect.width / 2 - FLY_IMAGE_SIZE / 2;
    const startY = sourceRect.top + sourceRect.height / 2 - FLY_IMAGE_SIZE / 2;
    const endX = target.rect.left + target.rect.width / 2 - FLY_IMAGE_SIZE / 2;
    const endY = target.rect.top + target.rect.height / 2 - FLY_IMAGE_SIZE / 2;

    clone.src = options.imageUrl ?? '';
    clone.alt = options.imageAlt;
    clone.setAttribute('aria-hidden', 'true');
    clone.decoding = 'async';
    clone.loading = 'eager';
    clone.style.cssText = [
      'position: fixed',
      `left: ${startX}px`,
      `top: ${startY}px`,
      `width: ${FLY_IMAGE_SIZE}px`,
      `height: ${FLY_IMAGE_SIZE}px`,
      'z-index: 2147483647',
      'pointer-events: none',
      'border-radius: 14px',
      'object-fit: cover',
      'box-shadow: 0 18px 45px -24px rgba(15, 23, 42, 0.55)',
      'will-change: transform, opacity',
    ].join(';');

    document.body.appendChild(clone);

    if (typeof clone.animate !== 'function') {
      removeClone(clone);
      return;
    }

    try {
      const animation = clone.animate(
        [
          {
            opacity: 0,
            transform: 'translate3d(0, 0, 0) scale(0.78)',
          },
          {
            opacity: 0.95,
            offset: 0.18,
            transform: 'translate3d(0, -8px, 0) scale(1)',
          },
          {
            opacity: 0.88,
            offset: 0.76,
            transform: `translate3d(${(endX - startX) * 0.82}px, ${(endY - startY) * 0.82}px, 0) scale(0.72)`,
          },
          {
            opacity: 0,
            transform: `translate3d(${endX - startX}px, ${endY - startY}px, 0) scale(0.32)`,
          },
        ],
        {
          duration: FLY_ANIMATION_MS,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        },
      );

      void animation.finished.then(
        () => removeClone(clone),
        () => removeClone(clone),
      );
    } catch {
      removeClone(clone);
    }
  });
}

export function flyProductImageToTarget(options: IFlyProductImageToTargetOptions) {
  try {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !options.imageUrl ||
      shouldSkipMotion()
    ) {
      return;
    }

    runFlyAnimation(options);
  } catch {
    // Decorative feedback should never affect storefront actions.
  }
}
