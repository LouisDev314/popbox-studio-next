import { expect, test } from './fixtures/mock-services';

test('Kuji prizes hydrate and open without Array.prototype.toSorted', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(Array.prototype, 'toSorted', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  await page.goto('/products/second-featured-kuji');
  await expect(page.getByRole('heading', { name: 'Prizes List', exact: true })).toBeVisible();
  const prizeA = page.getByRole('region', { name: 'Prize A', exact: true });
  await expect(prizeA.getByRole('button')).toHaveText([
    /Second Prize/,
    /Tenth Prize/,
  ]);
  await prizeA.getByRole('button', { name: /Second Prize/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /Second Prize/ })).toBeVisible();
  expect(errors).toEqual([]);
});
