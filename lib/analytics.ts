import type {
  ICartItem,
  ICartProduct,
  ICartVariantSnapshot,
} from '@/interfaces/cart';
import type { IOrderDetail, IOrderItem } from '@/interfaces/order';
import type { IProduct, IProductCard } from '@/interfaces/product';
import { getCartItemUnitPrice } from '@/utils/cart';

export const GA_CURRENCY = 'CAD';
export const ANALYTICS_READY_EVENT = 'popbox:analytics-ready';

const PURCHASE_STORAGE_KEY = 'popbox_ga_purchase_ids';
const MAX_STORED_PURCHASE_IDS = 100;
const SENSITIVE_SEARCH_PATTERN = /(?:@|\b(?:token|session|password|secret|stripe|access[_-]?key)\b|https?:\/\/|[A-Za-z0-9_-]{32,})/i;
const recordedPurchaseIds = new Set<string>();

type GtagCommand = 'config' | 'event' | 'js';
type Gtag = (...args: [GtagCommand, string | Date, Record<string, unknown>?]) => void;

declare global {
  interface Window {
    __popboxGaInitialized?: boolean;
    __popboxGaReady?: boolean;
    __popboxGaStorefrontActive?: boolean;
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export interface IGaItem {
  item_id: string;
  item_name: string;
  item_category: 'Ichiban Kuji' | 'Standard Product';
  item_variant?: string;
  price: number;
  quantity: number;
  currency: typeof GA_CURRENCY;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
}

export interface IAnalyticsListContext {
  id: string;
  name: string;
}

type AnalyticsProduct = IProduct | IProductCard | ICartProduct;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeQuantity(quantity: number): number | null {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return null;
  }

  return Math.floor(quantity);
}

export function centsToCad(cents: number): number | null {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    return null;
  }

  return cents / 100;
}

function getProductItemId(product: AnalyticsProduct): string | null {
  const sku = 'sku' in product ? product.sku : null;

  if (isNonEmptyString(sku)) {
    return sku.trim();
  }

  return isNonEmptyString(product.id) ? product.id.trim() : null;
}

function getItemCategory(productType: string): IGaItem['item_category'] {
  return productType === 'kuji' ? 'Ichiban Kuji' : 'Standard Product';
}

export function mapProductToGaItem(
  product: AnalyticsProduct,
  quantity = 1,
  options: { index?: number; list?: IAnalyticsListContext } = {},
): IGaItem | null {
  const itemId = getProductItemId(product);
  const itemName = product.name?.trim();
  const price = centsToCad(product.priceCents);
  const normalizedQuantity = normalizeQuantity(quantity);

  if (!itemId || !itemName || price === null || normalizedQuantity === null) {
    return null;
  }

  const item: IGaItem = {
    item_id: itemId,
    item_name: itemName,
    item_category: getItemCategory(product.productType),
    price,
    quantity: normalizedQuantity,
    currency: GA_CURRENCY,
  };

  if (product.productType === 'kuji') {
    item.item_variant = 'Ticket';
  }

  if (Number.isSafeInteger(options.index) && (options.index ?? -1) >= 0) {
    item.index = options.index;
  }

  if (options.list) {
    item.item_list_id = options.list.id;
    item.item_list_name = options.list.name;
  }

  return item;
}

export function mapOrderItemToGaItem(item: IOrderItem): IGaItem | null {
  const itemId = item.productId?.trim();
  const itemName = item.productName?.trim();
  const price = centsToCad(item.unitPriceCents);
  const quantity = normalizeQuantity(item.quantity);

  if (!itemId || !itemName || price === null || quantity === null) {
    return null;
  }

  const gaItem: IGaItem = {
    item_id: itemId,
    item_name: itemName,
    item_category: getItemCategory(item.productType),
    price,
    quantity,
    currency: GA_CURRENCY,
  };

  if (item.productType === 'kuji') {
    gaItem.item_variant = 'Ticket';
  } else if (item.variantName) {
    gaItem.item_variant = item.variantName;
  }

  return gaItem;
}

function mapCartItems(items: ICartItem[]): IGaItem[] {
  return items
    .map((item) => {
      const gaItem = mapProductToGaItem({
        ...item.product,
        priceCents: getCartItemUnitPrice(item),
      }, item.quantity);

      if (gaItem && item.product.productType === 'standard' && item.variant) {
        gaItem.item_variant = item.variant.name;
      }

      return gaItem;
    })
    .filter((item): item is IGaItem => item !== null);
}

function getGtag(): Gtag | null {
  if (
    typeof window === 'undefined'
    || !window.__popboxGaReady
    || !window.__popboxGaStorefrontActive
    || typeof window.gtag !== 'function'
  ) {
    return null;
  }

  return window.gtag;
}

function sendEvent(eventName: string, params: Record<string, unknown>): boolean {
  try {
    const gtag = getGtag();

    if (!gtag) {
      return false;
    }

    gtag('event', eventName, params);
    return true;
  } catch {
    return false;
  }
}

export function initializeGoogleAnalytics(measurementId: string, debugMode: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  const wasReady = window.__popboxGaReady === true;
  window.__popboxGaStorefrontActive = true;
  window.__popboxGaReady = true;

  if (window.__popboxGaInitialized) {
    if (!wasReady) {
      window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    }
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? (function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js identifies commands by the native Arguments object.
    window.dataLayer?.push(arguments);
  } as Gtag);
  window.__popboxGaInitialized = true;
  window.__popboxGaReady = true;
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    debug_mode: debugMode,
    send_page_view: false,
  });
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
}

export function deactivateGoogleAnalytics(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.__popboxGaStorefrontActive = false;
  window.__popboxGaReady = false;
}

export function isAnalyticsReady(): boolean {
  return typeof window !== 'undefined'
    && window.__popboxGaReady === true
    && window.__popboxGaStorefrontActive === true;
}

export function trackPageView(pathname: string): boolean {
  if (typeof window === 'undefined' || !pathname.startsWith('/')) {
    return false;
  }

  return sendEvent('page_view', {
    page_location: `${window.location.origin}${pathname}`,
    page_path: pathname,
    page_title: document.title,
  });
}

export function trackViewItem(product: AnalyticsProduct): boolean {
  const item = mapProductToGaItem(product);

  if (!item) {
    return false;
  }

  return sendEvent('view_item', {
    currency: GA_CURRENCY,
    value: item.price,
    items: [item],
  });
}

export function trackViewItemList(products: IProductCard[], list: IAnalyticsListContext): boolean {
  const items = products
    .map((product, index) => mapProductToGaItem(product, 1, { index, list }))
    .filter((item): item is IGaItem => item !== null);

  if (items.length === 0) {
    return false;
  }

  return sendEvent('view_item_list', {
    item_list_id: list.id,
    item_list_name: list.name,
    items,
  });
}

export function trackSelectItem(
  product: IProductCard,
  list: IAnalyticsListContext,
  index: number,
): boolean {
  const item = mapProductToGaItem(product, 1, { index, list });

  if (!item) {
    return false;
  }

  return sendEvent('select_item', {
    item_list_id: list.id,
    item_list_name: list.name,
    items: [item],
  });
}

export function trackSearch(searchTerm: string): boolean {
  const normalizedTerm = searchTerm.trim().replace(/\s+/g, ' ');

  if (!normalizedTerm || normalizedTerm.length > 100 || SENSITIVE_SEARCH_PATTERN.test(normalizedTerm)) {
    return false;
  }

  return sendEvent('search', { search_term: normalizedTerm });
}

export function trackAddToCart(
  product: ICartProduct,
  quantity: number,
  variant: ICartVariantSnapshot | null = null,
): boolean {
  const item = mapProductToGaItem({
    ...product,
    priceCents: product.productType === 'standard' && variant
      ? variant.priceCents
      : product.priceCents,
  }, quantity);

  if (!item) {
    return false;
  }

  if (product.productType === 'standard' && variant) {
    item.item_variant = variant.name;
  }

  return sendEvent('add_to_cart', {
    currency: GA_CURRENCY,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackRemoveFromCart(items: ICartItem[]): boolean {
  const gaItems = mapCartItems(items);

  if (gaItems.length === 0) {
    return false;
  }

  return sendEvent('remove_from_cart', {
    currency: GA_CURRENCY,
    value: gaItems.reduce((total, item) => total + (item.price * item.quantity), 0),
    items: gaItems,
  });
}

export function trackViewCart(items: ICartItem[]): boolean {
  const gaItems = mapCartItems(items);

  if (gaItems.length === 0) {
    return false;
  }

  return sendEvent('view_cart', {
    currency: GA_CURRENCY,
    value: gaItems.reduce((total, item) => total + (item.price * item.quantity), 0),
    items: gaItems,
  });
}

export function trackBeginCheckout(items: ICartItem[]): boolean {
  const gaItems = mapCartItems(items);

  if (gaItems.length === 0) {
    return false;
  }

  return sendEvent('begin_checkout', {
    currency: GA_CURRENCY,
    value: gaItems.reduce((total, item) => total + (item.price * item.quantity), 0),
    items: gaItems,
  });
}

export function isAnalyticsPurchaseOrder(order: IOrderDetail): boolean {
  return Boolean(
    order.paidAt
    && ['paid', 'paid_needs_attention', 'packed', 'shipped'].includes(order.status)
    && order.publicId?.trim(),
  );
}

function getStoredPurchaseIds(storage: Pick<Storage, 'getItem'>): string[] {
  try {
    const storedValue = storage.getItem(PURCHASE_STORAGE_KEY);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter(isNonEmptyString)
      : [];
  } catch {
    return [];
  }
}

function persistPurchaseId(storage: Pick<Storage, 'getItem' | 'setItem'>, publicId: string): void {
  try {
    const nextIds = [...new Set([...getStoredPurchaseIds(storage), publicId])]
      .slice(-MAX_STORED_PURCHASE_IDS);
    storage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Storage may be unavailable in privacy modes; the in-memory guard still applies.
  }
}

export function trackPurchaseOnce(
  order: IOrderDetail,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): boolean {
  const publicId = order.publicId?.trim();

  if (!publicId || !isAnalyticsPurchaseOrder(order) || recordedPurchaseIds.has(publicId)) {
    return false;
  }

  if (storage && getStoredPurchaseIds(storage).includes(publicId)) {
    recordedPurchaseIds.add(publicId);
    return false;
  }

  const value = centsToCad(order.totalCents);
  const tax = centsToCad(order.taxCents);
  const shipping = centsToCad(order.shippingCents);
  const items = order.items
    .map(mapOrderItemToGaItem)
    .filter((item): item is IGaItem => item !== null);

  if (value === null || tax === null || shipping === null || items.length === 0) {
    return false;
  }

  recordedPurchaseIds.add(publicId);
  const sent = sendEvent('purchase', {
    transaction_id: publicId,
    currency: GA_CURRENCY,
    value,
    tax,
    shipping,
    items,
  });

  if (!sent) {
    recordedPurchaseIds.delete(publicId);
    return false;
  }

  if (storage) {
    persistPurchaseId(storage, publicId);
  }

  return true;
}

export function resetAnalyticsStateForTests(): void {
  recordedPurchaseIds.clear();
}
