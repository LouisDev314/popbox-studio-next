// TODO: Replace fallback constants with public backend shipping settings
// once GET /api/v1/settings/shipping or a cart preview endpoint exists.
// Never call admin settings endpoints from public storefront code.
export const FREE_SHIPPING_THRESHOLD_CENTS = 14900;
export const FLAT_SHIPPING_CENTS = 1599;
export const SHIPPING_CURRENCY = 'CAD';
