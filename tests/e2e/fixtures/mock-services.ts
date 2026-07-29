import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, sign } from 'node:crypto';
import { expect, test as base } from '@playwright/test';

interface IAuthMockState {
  accessToken: () => string;
  featuredOrderIds: string[];
  profileRequests: number;
  revealedResultIds: Set<string>;
  reset: () => void;
  sessionCookieValue: () => string;
  triggerFeaturedConflict: () => void;
}

const confirmedAt = '2026-07-15T18:00:00.000Z';
const playwrightOrigin = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? '3001'}`;
const jwtPrivateKey = process.env.PLAYWRIGHT_JWT_PRIVATE_KEY;
const jwtPublicJwk = process.env.PLAYWRIGHT_JWT_PUBLIC_JWK;

if (!jwtPrivateKey || !jwtPublicJwk) {
  throw new Error('Playwright JWT keys must be initialized by playwright.config.ts.');
}

const jwtSigningKey: string = jwtPrivateKey;
const jwtPublicKey = {
  ...(JSON.parse(jwtPublicJwk) as JsonWebKey),
  alg: 'RS256',
  kid: 'e2e-account-key',
  use: 'sig',
};
const customerUser = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'confirmed@example.com',
  email_confirmed_at: confirmedAt,
  phone: '',
  confirmed_at: confirmedAt,
  last_sign_in_at: confirmedAt,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [{ id: 'email-identity', user_id: '11111111-1111-4111-8111-111111111111', identity_data: { email: 'confirmed@example.com' }, provider: 'email', created_at: confirmedAt, updated_at: confirmedAt }],
  created_at: confirmedAt,
  updated_at: confirmedAt,
  is_anonymous: false,
};

function encodeJwtPart(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createAccessToken() {
  const signingInput = [
    encodeJwtPart({ alg: 'RS256', kid: 'e2e-account-key', typ: 'JWT' }),
    encodeJwtPart({
      aud: 'authenticated',
      email: customerUser.email,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      is_anonymous: false,
      role: 'authenticated',
      session_id: 'e2e-session',
      sub: customerUser.id,
      user_metadata: {},
      app_metadata: customerUser.app_metadata,
    }),
  ].join('.');

  return `${signingInput}.${sign('RSA-SHA256', Buffer.from(signingInput), jwtSigningKey).toString('base64url')}`;
}

function createSession() {
  return {
    access_token: createAccessToken(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: customerUser,
  };
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sendJson(response: ServerResponse, data: unknown, status = 200) {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, apikey, x-client-info, x-supabase-api-version',
    'Access-Control-Allow-Origin': playwrightOrigin,
    Connection: 'close',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(data));
}

function apiData(data: unknown) {
  return { status: 'success', code: 200, success: true, message: 'OK', data };
}

function featuredMembershipSignature(productIds: string[]) {
  return createHash('sha256').update(JSON.stringify([...productIds].sort())).digest('hex');
}

const accountTaxBreakdown = {
  countryCode: 'CA', provinceCode: 'AB', taxableAmountCents: 5000,
  gstRatePpm: 50000, pstRatePpm: 0, hstRatePpm: 0, qstRatePpm: 0,
  gstCents: 250, pstCents: 0, hstCents: 0, qstCents: 0, totalTaxCents: 250,
};

const revealedPrize = {
  prizeCode: 'A', prizeTier: 'A', name: 'Hero Figure', description: 'A premium revealed prize.', imageUrl: null,
};

const hiddenPrize = {
  prizeCode: 'S', prizeTier: 'S', name: 'Secret Prize', description: 'This must never appear before reveal.', imageUrl: null,
};

const featuredCollection = {
  id: '00000000-0000-4000-8000-000000000100',
  name: 'Featured',
  slug: 'featured',
  description: 'Homepage products',
  sortOrder: 0,
  isActive: true,
};

const adminFeaturedProducts = [
  { id: '00000000-0000-4000-8000-000000000201', name: 'First Featured Figure', slug: 'first-featured-figure', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000202', name: 'Second Featured Kuji', slug: 'second-featured-kuji', productType: 'kuji' as const },
  { id: '00000000-0000-4000-8000-000000000203', name: 'Final Featured Plush', slug: 'final-featured-plush', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000204', name: 'Featured Acrylic Stand', slug: 'featured-acrylic-stand', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000205', name: 'Featured Character Badge', slug: 'featured-character-badge', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000206', name: 'Featured Prize Kuji', slug: 'featured-prize-kuji', productType: 'kuji' as const },
  { id: '00000000-0000-4000-8000-000000000207', name: 'Featured Art Board', slug: 'featured-art-board', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000208', name: 'Featured Mascot Plush', slug: 'featured-mascot-plush', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000209', name: 'Featured Towel Set', slug: 'featured-towel-set', productType: 'standard' as const },
  { id: '00000000-0000-4000-8000-000000000210', name: 'Featured Anniversary Kuji', slug: 'featured-anniversary-kuji', productType: 'kuji' as const },
];

const addableAdminProducts = Array.from({ length: 13 }, (_, index) => {
  const position = index + 1;
  const suffix = String(300 + position).padStart(12, '0');
  const isFinalProduct = position === 13;

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    name: isFinalProduct ? 'Beyond First Page Product' : `Addable Product ${String(position).padStart(2, '0')}`,
    slug: isFinalProduct ? 'beyond-first-page-product' : `addable-product-${position}`,
    productType: 'standard' as const,
  };
});

const adminCatalogProducts = [...adminFeaturedProducts, ...addableAdminProducts];

function adminFeaturedOrderItem(productId: string, sortOrder: number) {
  const product = adminCatalogProducts.find((candidate) => candidate.id === productId);
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    status: 'active',
    productType: product.productType,
    sortOrder,
    collections: [{ id: featuredCollection.id, name: featuredCollection.name, slug: featuredCollection.slug }],
    primaryImage: null,
  };
}

function adminProductListItem(product: typeof adminCatalogProducts[number], isFeatured = true) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: 'active',
    productType: product.productType,
    priceCents: 4999,
    currency: 'CAD',
    sku: null,
    collections: isFeatured
      ? [{ id: featuredCollection.id, name: featuredCollection.name, slug: featuredCollection.slug }]
      : [],
    inventory: null,
    tags: [],
    primaryImage: null,
    updatedAt: confirmedAt,
  };
}

function storefrontProductCard(productId: string) {
  const product = adminCatalogProducts.find((candidate) => candidate.id === productId);
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: null,
    updatedAt: confirmedAt,
    productType: product.productType,
    status: 'active',
    priceCents: 4999,
    minPriceCents: 4999,
    maxPriceCents: 4999,
    hasPriceRange: false,
    isSoldOut: false,
    defaultVariantId: product.productType === 'standard'
      ? '00000000-0000-4000-8000-000000000301'
      : null,
    hasVariantChoices: false,
    currency: 'CAD',
    collections: [{ id: featuredCollection.id, name: featuredCollection.name, slug: featuredCollection.slug }],
    images: [],
    inventory: null,
  };
}

const standardVariantProduct = {
  ...storefrontProductCard(adminFeaturedProducts[0].id)!,
  description: 'A figure with two customer-selectable sizes.',
  sku: null,
  tags: [],
  kujiPrizes: [],
  createdAt: confirmedAt,
  priceCents: 2499,
  minPriceCents: 2499,
  maxPriceCents: 4499,
  hasPriceRange: true,
  defaultVariantId: '00000000-0000-4000-8000-000000000301',
  hasVariantChoices: true,
  priceRange: { minCents: 2499, maxCents: 4499, isRange: true },
  variants: [
    {
      id: '00000000-0000-4000-8000-000000000301',
      name: 'Small',
      priceCents: 2499,
      sortOrder: 0,
      isAvailable: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000302',
      name: 'Large',
      priceCents: 3499,
      sortOrder: 1,
      isAvailable: true,
    },
    {
      id: '00000000-0000-4000-8000-000000000303',
      name: 'Collector',
      priceCents: 4499,
      sortOrder: 2,
      isAvailable: false,
    },
  ],
};

function accountKujiResult(id: string, revealed: boolean) {
  return {
    id,
    createdAt: confirmedAt,
    revealedAt: revealed ? confirmedAt : null,
    voidedAt: null,
    voidReason: null,
    prize: revealed ? (id === 'result-revealed' ? revealedPrize : hiddenPrize) : null,
  };
}

function accountOrderDetail(state: IAuthMockState) {
  return {
    publicId: 'PBX-ACCOUNT-1', status: 'paid', includesLastOnePrize: false, currency: 'CAD',
    subtotalCents: 5000, taxCents: 250, taxBreakdown: accountTaxBreakdown, shippingCents: 0,
    discountCents: 0, totalCents: 5250, customerNote: null, createdAt: confirmedAt, placedAt: confirmedAt,
    paidAt: confirmedAt, cancelledAt: null, refundedAt: null,
    shippingAddress: { fullName: 'Confirmed Customer', line1: '1 Main Street', city: 'Edmonton', province: 'AB', postalCode: 'T5J 0N3', countryCode: 'CA' },
    billingAddress: null,
    customer: { email: customerUser.email, firstName: 'Confirmed', lastName: 'Customer', phone: null },
    shipment: null,
    items: [
      {
        productId: 'standard-1', productName: 'Active Figure', productType: 'standard', productSlug: 'active-figure',
        variantId: '00000000-0000-4000-8000-000000000301', variantName: 'Small', variantSku: 'FIG-S',
        isStorefrontAccessible: true, unitPriceCents: 2000, quantity: 1, lineTotalCents: 2000, imageUrl: null,
        imageAltText: null, kujiResults: [],
      },
      {
        productId: 'kuji-1', productName: 'Archived Kuji Snapshot', productType: 'kuji', productSlug: 'archived-kuji',
        isStorefrontAccessible: false, unitPriceCents: 1500, quantity: 2, lineTotalCents: 3000, imageUrl: null,
        imageAltText: null,
        kujiResults: [
          accountKujiResult('result-revealed', true),
          accountKujiResult('result-hidden', state.revealedResultIds.has('result-hidden')),
        ],
      },
    ],
  };
}

function accountOrderSummary(publicId: string, status: 'paid' | 'packed' | 'shipped' | 'refunded') {
  return {
    publicId, status, createdAt: confirmedAt, placedAt: confirmedAt, currency: 'CAD',
    subtotalCents: 5000, shippingCents: 0, taxCents: 250, taxBreakdown: accountTaxBreakdown,
    discountCents: 0, totalCents: 5250, shipment: null,
    products: [
      { productId: 'standard-1', productName: 'Active Figure', productType: 'standard', productSlug: 'active-figure', isStorefrontAccessible: true, quantity: 1, imageUrl: null, imageAltText: null },
      { productId: 'kuji-1', productName: 'Archived Kuji Snapshot', productType: 'kuji', productSlug: 'archived-kuji', isStorefrontAccessible: false, quantity: 2, imageUrl: null, imageAltText: null },
    ],
  };
}

function accountOrderDetailFor(
  state: IAuthMockState,
  publicId: string,
  status: 'paid' | 'packed' | 'shipped',
  kind: 'standard' | 'kuji' | 'mixed',
) {
  const detail = accountOrderDetail(state);
  const kujiOnlyItem = {
    ...detail.items[1],
    kujiResults: [
      accountKujiResult('result-revealed', true),
      accountKujiResult('kuji-only-hidden', false),
    ],
  };
  const items = kind === 'standard'
    ? [detail.items[0]]
    : kind === 'kuji'
      ? [kujiOnlyItem]
      : detail.items;

  return { ...detail, publicId, status, items };
}

function createRequestHandler(state: IAuthMockState) {
  // eslint-disable-next-line complexity -- One local HTTP boundary keeps the auth journey fixture deterministic and easy to reset.
  return async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, apikey, x-client-info, x-supabase-api-version',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': playwrightOrigin,
        Connection: 'close',
      });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1:4010');
    const pathname = requestUrl.pathname;

    if (pathname === '/auth/v1/.well-known/jwks.json' && request.method === 'GET') {
      sendJson(response, { keys: [jwtPublicKey] });
      return;
    }

    if (pathname === '/auth/v1/signup' && request.method === 'POST') {
      sendJson(response, {
        user: { ...customerUser, email_confirmed_at: null, confirmed_at: null },
        session: null,
      });
      return;
    }

    if (pathname === '/auth/v1/token' && request.method === 'POST') {
      const grantType = requestUrl.searchParams.get('grant_type');
      const body = await readJson(request);

      if (grantType === 'password') {
        const email = typeof body.email === 'string' ? body.email : '';
        if (email === 'admin@example.com') {
          sendJson(response, createSession());
          return;
        }

        if (email === 'service@example.com') {
          sendJson(response, { code: 'unexpected_failure', message: 'raw upstream outage detail' }, 503);
          return;
        }

        const error = email === 'unconfirmed@example.com'
          ? { code: 'email_not_confirmed', message: 'Email not confirmed' }
          : { code: 'invalid_credentials', message: email === 'unknown@example.com' ? 'User not found' : 'Invalid login credentials' };
        sendJson(response, error, 400);
        return;
      }

      if (grantType === 'pkce' || grantType === 'refresh_token') {
        sendJson(response, createSession());
        return;
      }
    }

    if (pathname === '/auth/v1/user' && request.method === 'GET') {
      sendJson(response, customerUser);
      return;
    }

    if (pathname === '/auth/v1/logout' && request.method === 'POST') {
      response.writeHead(204, {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': playwrightOrigin,
        Connection: 'close',
      });
      response.end();
      return;
    }

    if (pathname === '/auth/v1/resend' && request.method === 'POST') {
      sendJson(response, {});
      return;
    }

    if (pathname === '/api/v1/account/profile') {
      state.profileRequests += 1;
      sendJson(response, apiData({
        account: {
          id: customerUser.id,
          email: customerUser.email,
          emailVerified: true,
          createdAt: confirmedAt,
        },
        profile: {
          firstName: 'Confirmed',
          lastName: 'Customer',
          phone: null,
          createdAt: confirmedAt,
          updatedAt: confirmedAt,
        },
      }));
      return;
    }

    if (pathname === '/api/v1/account/orders') {
      sendJson(response, apiData({
        items: [
          accountOrderSummary('PBX-ACCOUNT-1', 'paid'),
          accountOrderSummary('PBX-STANDARD-ONLY', 'packed'),
          accountOrderSummary('PBX-KUJI-ONLY', 'shipped'),
          accountOrderSummary('PBX-REFUNDED', 'refunded'),
        ],
        nextCursor: null,
      }));
      return;
    }

    if (pathname === '/api/v1/account/orders/PBX-ACCOUNT-1' && request.method === 'GET') {
      sendJson(response, apiData(accountOrderDetailFor(state, 'PBX-ACCOUNT-1', 'paid', 'mixed')));
      return;
    }

    if (pathname === '/api/v1/account/orders/PBX-STANDARD-ONLY' && request.method === 'GET') {
      sendJson(response, apiData(accountOrderDetailFor(state, 'PBX-STANDARD-ONLY', 'packed', 'standard')));
      return;
    }

    if (pathname === '/api/v1/account/orders/PBX-KUJI-ONLY' && request.method === 'GET') {
      sendJson(response, apiData(accountOrderDetailFor(state, 'PBX-KUJI-ONLY', 'shipped', 'kuji')));
      return;
    }

    if (
      ['PBX-EXPIRED', 'PBX-CANCELLED', 'PBX-PAYMENT-REVIEW'].some((publicId) => (
        pathname === `/api/v1/account/orders/${publicId}`
        || pathname.startsWith(`/api/v1/account/orders/${publicId}/tickets/`)
      ))
    ) {
      sendJson(response, {
        status: 'error', code: 404, success: false, message: 'Order not found', data: null,
        errors: { code: 'ORDER_NOT_FOUND' },
      }, 404);
      return;
    }

    if (pathname === '/api/v1/account/orders/PBX-ACCOUNT-1/tickets/result-hidden/reveal' && request.method === 'POST') {
      state.revealedResultIds.add('result-hidden');
      sendJson(response, apiData(accountKujiResult('result-hidden', true)));
      return;
    }

    if (pathname === '/api/v1/account/orders/PBX-ACCOUNT-1/tickets/reveal-all' && request.method === 'POST') {
      state.revealedResultIds.add('result-hidden');
      sendJson(response, apiData({
        results: [accountKujiResult('result-revealed', true), accountKujiResult('result-hidden', true)],
      }));
      return;
    }

    if (pathname === '/api/v1/account/kuji-history') {
      sendJson(response, apiData({
        items: [
          {
            ...accountKujiResult('history-revealed', true),
            order: { publicId: 'PBX-ACCOUNT-1', placedAt: confirmedAt },
            product: { productId: 'kuji-active', name: 'Active History Kuji', slug: 'active-history-kuji', isStorefrontAccessible: true, imageUrl: null, imageAltText: null },
          },
          {
            ...accountKujiResult('history-hidden', false),
            order: { publicId: 'PBX-ACCOUNT-1', placedAt: confirmedAt },
            product: { productId: 'kuji-active', name: 'Active History Kuji', slug: 'active-history-kuji', isStorefrontAccessible: true, imageUrl: null, imageAltText: null },
          },
        ],
        nextCursor: null,
      }));
      return;
    }

    if (pathname === '/api/v1/admin/collections' && request.method === 'GET') {
      sendJson(response, apiData([featuredCollection]));
      return;
    }

    if (pathname === '/api/v1/admin/products' && request.method === 'GET') {
      const excludedCollectionId = requestUrl.searchParams.get('excludeCollectionId');
      const search = requestUrl.searchParams.get('search')?.trim().toLocaleLowerCase() ?? '';
      const cursor = requestUrl.searchParams.get('cursor');

      if (excludedCollectionId === featuredCollection.id) {
        const eligibleProducts = addableAdminProducts.filter((product) => (
          !state.featuredOrderIds.includes(product.id)
          && (!search || product.name.toLocaleLowerCase().includes(search))
        ));
        const pageStart = cursor === 'addable-page-2' ? 12 : 0;
        const pageItems = eligibleProducts.slice(pageStart, pageStart + 12);

        sendJson(response, apiData({
          items: pageItems.map((product) => adminProductListItem(product, false)),
          nextCursor: pageStart === 0 && eligibleProducts.length > 12 ? 'addable-page-2' : null,
          totalCount: eligibleProducts.length,
        }));
        return;
      }

      sendJson(response, apiData({
        items: adminCatalogProducts.map((product) => (
          adminProductListItem(product, state.featuredOrderIds.includes(product.id))
        )),
        nextCursor: null,
        totalCount: adminCatalogProducts.length,
      }));
      return;
    }

    const adminProductMatch = pathname.match(/^\/api\/v1\/admin\/products\/([^/]+)$/);
    if (adminProductMatch && request.method === 'PATCH') {
      const productId = adminProductMatch[1];
      const body = await readJson(request);
      const collectionIds = Array.isArray(body.collectionIds)
        ? body.collectionIds.filter((collectionId): collectionId is string => typeof collectionId === 'string')
        : [];

      if (collectionIds.includes(featuredCollection.id) && !state.featuredOrderIds.includes(productId)) {
        state.featuredOrderIds.push(productId);
      }

      sendJson(response, apiData({ id: productId }));
      return;
    }

    if (pathname === '/api/v1/admin/tags' && request.method === 'GET') {
      sendJson(response, apiData([]));
      return;
    }

    if (pathname === '/api/v1/admin/collections/featured/order' && request.method === 'GET') {
      sendJson(response, apiData({
        items: state.featuredOrderIds.flatMap((productId, index) => {
          const product = adminFeaturedOrderItem(productId, index);
          return product ? [product] : [];
        }),
        membershipSignature: featuredMembershipSignature(state.featuredOrderIds),
      }));
      return;
    }

    if (pathname === '/api/v1/admin/collections/featured/order' && request.method === 'PUT') {
      const body = await readJson(request);
      if (body.membershipSignature !== featuredMembershipSignature(state.featuredOrderIds)) {
        sendJson(response, {
          status: 'error',
          code: 409,
          success: false,
          message: 'Featured membership changed',
          data: null,
          errors: { code: 'FEATURED_MEMBERSHIP_CHANGED' },
        }, 409);
        return;
      }

      const productIds = Array.isArray(body.productIds)
        ? body.productIds.filter((productId): productId is string => typeof productId === 'string')
        : [];
      if (productIds.some((productId) => !state.featuredOrderIds.includes(productId))) {
        sendJson(response, {
          status: 'error', code: 409, success: false, message: 'Featured membership changed', data: null,
          errors: { code: 'FEATURED_MEMBERSHIP_CHANGED' },
        }, 409);
        return;
      }
      state.featuredOrderIds = productIds;
      sendJson(response, apiData({
        items: state.featuredOrderIds.flatMap((productId, index) => {
          const product = adminFeaturedOrderItem(productId, index);
          return product ? [product] : [];
        }),
        membershipSignature: featuredMembershipSignature(state.featuredOrderIds),
      }));
      return;
    }

    if (pathname === '/api/v1/home' && request.method === 'GET') {
      const featured = state.featuredOrderIds.flatMap((productId) => {
        const product = storefrontProductCard(productId);
        return product ? [product] : [];
      });
      sendJson(response, apiData({ featured, trendingNow: [], allProductsPreview: [] }));
      return;
    }

    if (pathname === `/api/v1/products/${standardVariantProduct.slug}` && request.method === 'GET') {
      sendJson(response, apiData(standardVariantProduct));
      return;
    }

    if (pathname === '/api/v1/collections') {
      sendJson(response, apiData([]));
      return;
    }

    if (pathname === '/api/v1/settings/store-banner') {
      sendJson(response, apiData({ enabled: false, message: '', href: null }));
      return;
    }

    if (pathname === '/api/v1/settings/shipping') {
      sendJson(response, apiData({ freeShippingThresholdCents: 15000, flatRateCents: 1500 }));
      return;
    }

    sendJson(response, { status: 'error', code: 404, success: false, message: 'Not found', data: null, errors: { code: 'NOT_FOUND' } }, 404);
  };
}

async function startMockServices(state: IAuthMockState) {
  const server = createServer(createRequestHandler(state));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(4010, '127.0.0.1', resolve);
  });
  return server;
}

export const test = base.extend<{ authMock: IAuthMockState; mockServices: void }>({
  authMock: async ({}, applyFixture) => {
    const state: IAuthMockState = {
      accessToken() {
        return createAccessToken();
      },
      featuredOrderIds: adminFeaturedProducts.map((product) => product.id),
      profileRequests: 0,
      revealedResultIds: new Set<string>(),
      reset() {
        this.featuredOrderIds = adminFeaturedProducts.map((product) => product.id);
        this.profileRequests = 0;
        this.revealedResultIds.clear();
      },
      sessionCookieValue() {
        return `base64-${Buffer.from(JSON.stringify(createSession())).toString('base64url')}`;
      },
      triggerFeaturedConflict() {
        this.featuredOrderIds = this.featuredOrderIds.slice(0, -1);
      },
    };
    await applyFixture(state);
  },
  mockServices: [async ({ authMock }, applyFixture) => {
    const server = await startMockServices(authMock);
    await applyFixture();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }, { auto: true }],
});

export { expect };
