// Cart totals are a client-owned preview until checkout confirms backend totals.
// Public policy/SEO pages read GET /api/v1/settings/shipping separately.
// Never call admin settings endpoints from public storefront code.
export const FREE_SHIPPING_THRESHOLD_CENTS = 14900;
export const FLAT_SHIPPING_CENTS = 1599;
export const SHIPPING_CURRENCY = 'CAD';
