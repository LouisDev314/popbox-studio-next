import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { expect, test as base } from '@playwright/test';

interface IAuthMockState {
  accessToken: () => string;
  featuredOrderIds: string[];
  forceFeaturedConflict: boolean;
  profileRequests: number;
  revealedResultIds: Set<string>;
  reset: () => void;
  sessionCookieValue: () => string;
  triggerFeaturedConflict: () => void;
}

const confirmedAt = '2026-07-15T18:00:00.000Z';
const playwrightOrigin = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? '3001'}`;
const jwtKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwtPublicKey = {
  ...jwtKeyPair.publicKey.export({ format: 'jwk' }),
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

  return `${signingInput}.${sign('RSA-SHA256', Buffer.from(signingInput), jwtKeyPair.privateKey).toString('base64url')}`;
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
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(data));
}

function apiData(data: unknown) {
  return { status: 'success', code: 200, success: true, message: 'OK', data };
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
];

function adminFeaturedOrderItem(productId: string, sortOrder: number) {
  const product = adminFeaturedProducts.find((candidate) => candidate.id === productId);
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

function adminProductListItem(product: typeof adminFeaturedProducts[number]) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: 'active',
    productType: product.productType,
    priceCents: 4999,
    currency: 'CAD',
    sku: null,
    collections: [{ id: featuredCollection.id, name: featuredCollection.name, slug: featuredCollection.slug }],
    inventory: null,
    tags: [],
    primaryImage: null,
    updatedAt: confirmedAt,
  };
}

function storefrontProductCard(productId: string) {
  const product = adminFeaturedProducts.find((candidate) => candidate.id === productId);
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
    currency: 'CAD',
    collections: [{ id: featuredCollection.id, name: featuredCollection.name, slug: featuredCollection.slug }],
    images: [],
    inventory: null,
  };
}

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
      sendJson(response, apiData({
        items: adminFeaturedProducts.map(adminProductListItem),
        nextCursor: null,
      }));
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
      }));
      return;
    }

    if (pathname === '/api/v1/admin/collections/featured/order' && request.method === 'PUT') {
      if (state.forceFeaturedConflict) {
        state.forceFeaturedConflict = false;
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

      const body = await readJson(request);
      const productIds = Array.isArray(body.productIds)
        ? body.productIds.filter((productId): productId is string => typeof productId === 'string')
        : [];
      state.featuredOrderIds = productIds;
      sendJson(response, apiData({
        items: state.featuredOrderIds.flatMap((productId, index) => {
          const product = adminFeaturedOrderItem(productId, index);
          return product ? [product] : [];
        }),
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
      forceFeaturedConflict: false,
      profileRequests: 0,
      revealedResultIds: new Set<string>(),
      reset() {
        this.featuredOrderIds = adminFeaturedProducts.map((product) => product.id);
        this.forceFeaturedConflict = false;
        this.profileRequests = 0;
        this.revealedResultIds.clear();
      },
      sessionCookieValue() {
        return `base64-${Buffer.from(JSON.stringify(createSession())).toString('base64url')}`;
      },
      triggerFeaturedConflict() {
        this.forceFeaturedConflict = true;
      },
    };
    await applyFixture(state);
  },
  mockServices: [async ({ authMock }, applyFixture) => {
    const server = await startMockServices(authMock);
    await applyFixture();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }, { auto: true }],
});

export { expect };
