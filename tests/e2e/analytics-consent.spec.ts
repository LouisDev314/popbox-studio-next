import { expect, test } from './fixtures/mock-services';

const isAnalyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  && process.env.NEXT_PUBLIC_GA_DEBUG === 'true',
);

test.describe('analytics consent hydration', () => {
  test.skip(!isAnalyticsEnabled, 'Run with Google Analytics enabled to mount the consent component.');

  for (const consent of ['accepted', 'declined'] as const) {
    test(`does not flash the banner on a hard refresh with ${consent} consent`, async ({ page }) => {
      await page.route('https://www.googletagmanager.com/**', async (route) => {
        await route.fulfill({ body: '', contentType: 'text/javascript' });
      });
      await page.addInitScript((storedConsent) => {
        window.localStorage.setItem('popbox_analytics_consent', storedConsent);

        const consentWindow = window as typeof window & { __consentBannerSeen?: boolean };
        consentWindow.__consentBannerSeen = false;

        const detectBanner = () => {
          if (document.querySelector('[aria-label="Analytics cookie preferences"]')) {
            consentWindow.__consentBannerSeen = true;
          }
        };

        new MutationObserver(detectBanner).observe(document, { childList: true, subtree: true });
        detectBanner();
      }, consent);

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Analytics cookie preferences' })).toHaveCount(0);
      expect(await page.evaluate(() => (window as typeof window & { __consentBannerSeen?: boolean }).__consentBannerSeen)).toBe(false);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Analytics cookie preferences' })).toHaveCount(0);
      expect(await page.evaluate(() => (window as typeof window & { __consentBannerSeen?: boolean }).__consentBannerSeen)).toBe(false);
    });
  }
});
