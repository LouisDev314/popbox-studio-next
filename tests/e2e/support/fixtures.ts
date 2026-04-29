import { expect, test as base } from '@playwright/test';

const IGNORED_CONSOLE_FRAGMENTS = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
];

function isCriticalConsoleMessage(message: string): boolean {
  return !IGNORED_CONSOLE_FRAGMENTS.some((fragment) => message.includes(fragment));
}

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, run) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return;
      }

      const text = message.text();

      if (isCriticalConsoleMessage(text)) {
        errors.push(`[console.error] ${text}`);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`[pageerror] ${error.message}`);
    });

    await run(errors);
  },
});

export { expect };
