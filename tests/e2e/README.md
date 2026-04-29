# PopBox Studio Pre-Prod E2E

## Test Matrix

| Area | Coverage | Default |
| --- | --- | --- |
| Smoke / availability | Storefront routes, header/footer/logo/nav, metadata, console errors | Yes |
| Storefront browsing | PLP cards, search page, sort/type URLs, configured PDPs, sold-out state | Yes when slugs are configured |
| Cart / wishlist | Add, quantity, remove, empty state, localStorage persistence, summary shipping message | Yes when `E2E_STANDARD_PRODUCT_SLUG` is configured |
| Checkout handoff | Standard cart to Stripe Checkout URL | Yes when `E2E_STANDARD_PRODUCT_SLUG` is configured |
| Stripe payment | Stripe test-card completion, success page, guest order access | `E2E_ENABLE_STRIPE_PAYMENT=true` |
| Kuji tickets | Paid kuji order, hidden unrevealed tickets, reveal one/all, reload persistence | `E2E_ENABLE_STRIPE_PAYMENT=true` and `E2E_KUJI_PRODUCT_SLUG` |
| Admin auth/pages | Redirect guard, login, core page load checks | Yes when admin credentials are configured |
| Admin mutations | Collection/tag create/edit, shipping/banner update/restore | `E2E_ENABLE_MUTATION_TESTS=true` |
| Product/kuji admin deep mutations | Product image upload, kuji prize image replacement, archive cleanup | Manual required |
| Refunds | Refund request and customer-facing verification | Manual unless `E2E_ENABLE_REFUND_TEST=true` is explicitly enabled |

## Running

```bash
pnpm test:e2e:preprod
```

The runner loads environment values from shell env first, then `.env.e2e.local`, `.env.e2e`, `.env.local`, and `.env` without overriding existing shell values.

If Playwright-managed browsers are not installed locally, run `pnpm exec playwright install chromium` or set `E2E_BROWSER_CHANNEL=chrome` to use an installed Chrome browser.

## Safety

Mutation tests use `e2e-`-style run IDs and are disabled by default. Shipping and banner tests restore the original state through the admin UI on a best-effort basis. Keep mutation tests pointed only at disposable pre-prod data.
