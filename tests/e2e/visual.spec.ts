import { test, expect } from './fixtures/mock-services';

for (const route of [
  ['sign-in', '/account/sign-in'],
  ['sign-up', '/account/sign-up'],
  ['forgot-password', '/account/forgot-password'],
] as const) {
  test(`${route[0]} visual`, async ({ page }, testInfo) => {
    await page.goto(route[1]);
    await page.locator('main').waitFor();
    await expect(page.locator('#store-account-trigger[aria-busy="true"]')).toHaveCount(0);
    await expect(page).toHaveScreenshot(`${route[0]}-${testInfo.project.name}.png`, {
      animations: 'disabled',
      fullPage: true,
    });
  });
}
