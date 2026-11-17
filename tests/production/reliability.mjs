import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import axios from 'axios';

const VALID_PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VALID_VARIANT_ID = '33333333-3333-4333-8333-333333333333';

// This fixture is local-only. Intentional outages must never reach production APIs
// or the real Sentry project, even when a developer has local production env files.
const port = Number(process.env.RELIABILITY_PORT ?? 3012);
const siteUrl = `http://127.0.0.1:${port}`;
const counts = new Map();
const state = { price: 4999, available: true, collectionsFail: false, homeFail: false, homeFailures: 0, homeReadAt: 0 };
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'reliability', use: 'sig' };
let collectionName = 'Reliability Collection';
let nextServer;

function product() {
  return {
    id: VALID_PRODUCT_ID, name: 'Reliability Figure', slug: 'reliability-figure',
    description: 'Local reliability fixture', productType: 'standard', status: 'active',
    priceCents: state.price, minPriceCents: state.price, maxPriceCents: state.price, hasPriceRange: false,
    currency: 'CAD', isSoldOut: !state.available, defaultVariantId: VALID_VARIANT_ID, hasVariantChoices: false,
    collections: [{ id: 'collection', slug: 'featured', name: collectionName }],
    images: [{ id: 'image', storageKey: `products/${VALID_PRODUCT_ID}/main.png`, url: '/icon.png', altText: 'Figure', sortOrder: 0 }],
    inventory: { onHand: state.available ? 10 : 0, available: state.available ? 10 : 0, reserved: 0, lowStockThreshold: 0 },
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z', sku: null, tags: [], kujiPrizes: [],
    variants: [{ id: VALID_VARIANT_ID, name: 'Default', priceCents: state.price, sortOrder: 0, isAvailable: state.available }],
    priceRange: { minCents: state.price, maxCents: state.price, isRange: false },
  };
}

function send(response, data, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json', Connection: 'close' });
  response.end(JSON.stringify({ status: status === 200 ? 'success' : 'error', code: status, success: status === 200, data }));
}

const origin = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  counts.set(path, (counts.get(path) ?? 0) + 1);
  if (path === '/auth/v1/.well-known/jwks.json') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [jwk] }));
  } else if (path === '/api/v1/collections') {
    send(response, [{ id: 'collection', slug: 'featured', name: collectionName, isActive: true, sortOrder: 0, description: null }], state.collectionsFail ? 503 : 200);
  } else if (path === '/api/v1/tags') {
    send(response, []);
  } else if (path === '/api/v1/home') {
    state.homeReadAt ||= Date.now();
    if (state.homeFail) state.homeFailures += 1;
    send(response, { featured: [product()], trendingNow: [], allProductsPreview: [] }, state.homeFail ? 503 : 200);
  } else if (path === '/api/v1/products') {
    send(response, { items: [product()], nextCursor: null });
  } else if (path === '/api/v1/products/reliability-figure') {
    send(response, product());
  } else if (path === '/api/v1/products/reliability-figure/recommendations') {
    send(response, { items: [], meta: { count: 0, limit: 4 } });
  } else if (path === '/api/v1/settings/shipping') {
    send(response, { currency: 'CAD', flatShippingCents: 1200, calgaryFreeShippingThresholdCents: 7500, albertaFreeShippingThresholdCents: 8500, freeShippingThresholdCents: 10000 });
  } else if (path === '/api/v1/admin/collections/reorder' && request.method === 'PATCH' && request.headers.authorization === 'Bearer fixture-admin') {
    collectionName = 'Updated Reliability Collection';
    send(response, []);
  } else {
    send(response, null, 404);
  }
});

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

async function waitFor(check, timeoutMs, message) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(250);
  }
  throw new Error(message);
}

try {
  await new Promise((resolve, reject) => {
    origin.once('error', reject);
    origin.listen(0, '127.0.0.1', resolve);
  });
  const apiUrl = `http://127.0.0.1:${origin.address().port}`;
  const env = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_fixture',
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: 'product-images',
    NEXT_PUBLIC_IS_SITE_OPEN: 'true',
    NEXT_PUBLIC_GA_MEASUREMENT_ID: '', NEXT_PUBLIC_GA_DEBUG: 'false',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: '', NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '',
    SENTRY_DSN: '', NEXT_PUBLIC_SENTRY_DSN: '', SENTRY_ENABLE_BUILD: 'false',
    NEXT_DIST_DIR: '.next', NEXT_TYPESCRIPT_CONFIG: 'tsconfig.json',
  };
  // Use the same pnpm version that launched this script.
  assert.ok(process.env.npm_execpath, 'Run with corepack pnpm test:production');
  await run(process.execPath, [process.env.npm_execpath, 'check'], env);
  nextServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...env, NODE_ENV: 'production' }, stdio: 'inherit',
  });
  const client = axios.create({ baseURL: siteUrl, timeout: 15_000, responseType: 'text', validateStatus: () => true });
  await waitFor(async () => {
    try { return (await client.get('/')).status === 200; } catch { return false; }
  }, 30_000, 'Production server did not become ready');

  await client.get('/products?sort=newest');
  const taxonomyCalls = counts.get('/api/v1/collections');
  const tagCalls = counts.get('/api/v1/tags');
  const productsBefore = counts.get('/api/v1/products') ?? 0;
  await client.get('/products?sort=price_asc');
  assert.equal(counts.get('/api/v1/collections'), taxonomyCalls, 'Taxonomy must persist between dynamic requests');
  assert.equal(counts.get('/api/v1/tags'), tagCalls, 'Tags must persist between dynamic requests');
  assert.ok(counts.get('/api/v1/products') > productsBefore, 'Product listings must remain live');

  const first = await client.get('/products/reliability-figure');
  assert.equal(first.status, 200);
  assert.ok(first.data.includes('49.99'));
  assert.ok(!first.headers['set-cookie'], 'Anonymous public pages must not set session cookies');
  state.price = 5999;
  state.available = false;
  const updated = await client.get('/products/reliability-figure');
  assert.equal(updated.status, 200);
  assert.ok(updated.data.includes('59.99'), 'Product price must not come from the taxonomy cache');
  assert.match(updated.headers['cache-control'], /private|no-store/);
  assert.ok(updated.data.includes('OutOfStock'), 'Structured data must use current availability');

  const beforeSitemap = counts.get('/api/v1/products') ?? 0;
  const sitemap = await client.get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.ok(sitemap.data.includes('/products/reliability-figure'));
  const afterSitemap = counts.get('/api/v1/products');
  assert.ok(afterSitemap > beforeSitemap);
  assert.equal((await client.get('/sitemap.xml')).data, sitemap.data);
  assert.equal(counts.get('/api/v1/products'), afterSitemap, 'Warm sitemap must not traverse catalog again');

  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', kid: 'reliability', typ: 'JWT' })}.${encode({
    sub: VALID_PRODUCT_ID, aud: 'authenticated', role: 'authenticated', iss: `${apiUrl}/auth/v1`,
    iat: now, exp: now + 3600, session_id: 'fixture-session', amr: [{ method: 'password', timestamp: now }],
  })}`;
  const token = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), keys.privateKey).toString('base64url')}`;
  const session = `base64-${encode({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_at: now + 3600, expires_in: 3600 })}`;
  const invalidation = await client.patch('/api/v1/admin/collections/reorder', { collectionIds: ['collection'] }, {
    headers: { Authorization: 'Bearer fixture-admin', Cookie: `sb-127-auth-token=${session}` },
  });
  assert.equal(invalidation.status, 200, 'Authenticated reorder must reach the local fixture');
  const reordered = await client.get('/collections/featured');
  assert.ok(reordered.data.includes('Updated Reliability Collection'), 'Successful reorder must invalidate taxonomy');

  // Invalidate again, then prove errors are not cached as empty/missing collections.
  await client.patch('/api/v1/admin/collections/reorder', { collectionIds: ['collection'] }, {
    headers: { Authorization: 'Bearer fixture-admin', Cookie: `sb-127-auth-token=${session}` },
  });
  state.collectionsFail = true;
  const unavailable = await client.get('/collections/featured');
  assert.notEqual(unavailable.status, 404);
  assert.ok(unavailable.data.includes('temporarily unavailable'));
  state.collectionsFail = false;
  assert.ok((await client.get('/collections/featured')).data.includes('Updated Reliability Collection'));

  // Warm the homepage after path invalidation, then exercise the actual 300s ISR
  // interval. No shortened production TTL or hand-edited Next cache files.
  const home = await client.get('/');
  assert.equal(home.status, 200);
  const homeReads = counts.get('/api/v1/home');
  await client.get('/');
  assert.equal(counts.get('/api/v1/home'), homeReads, 'Warm homepage must not call the origin');
  state.homeFail = true;
  console.info('Cache checks passed; waiting for the real five-minute homepage ISR expiry.');
  const expiresAt = Date.now() + 301_000;
  while (Date.now() < expiresAt) await delay(Math.min(15_000, expiresAt - Date.now()));
  await client.get('/');
  await waitFor(() => state.homeFailures > 0, 15_000, 'Homepage did not attempt background regeneration');
  const retained = await client.get('/');
  assert.equal(retained.status, 200);
  assert.ok(retained.data.includes('Reliability Figure'));
  assert.ok(!retained.data.includes('This page is temporarily unavailable'));
  console.info('Production checks passed: taxonomy reuse/invalidation, live commerce, sitemap reuse, and last-good homepage ISR.');
} finally {
  if (nextServer && nextServer.exitCode === null) {
    nextServer.kill('SIGTERM');
    await new Promise((resolve) => nextServer.once('exit', resolve));
  }
  origin.closeAllConnections();
  await new Promise((resolve) => origin.close(resolve));
}
