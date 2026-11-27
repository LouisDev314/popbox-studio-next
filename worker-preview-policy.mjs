const publicPaths = new Set([
  '/', '/home', '/products', '/collections', '/search', '/search/results',
  '/about', '/contact', '/faq', '/ichiban-kuji', '/cart',
  '/robots.txt', '/sitemap.xml', '/manifest.webmanifest',
  '/favicon.ico', '/icon.png', '/apple-icon.png', '/opengraph-image.png',
  '/kuji-bottom-cta.webp', '/kuji-ticket.webp', '/what-is-ichiban-kuji.webp',
  '/kuji-reveal.mp4', '/logo-kuji.png', '/store-logo.png', '/_next/image',
  '/api/v1/home', '/api/v1/products', '/api/v1/collections', '/api/v1/tags',
  '/api/v1/search', '/api/v1/search/autocomplete',
  '/api/v1/settings/shipping', '/api/v1/settings/store-banner',
]);

const publicPathPatterns = [
  /^\/(?:products|collections|legal)\/[a-z0-9_-]+$/i,
  /^\/api\/v1\/products\/[a-z0-9_-]+(?:\/recommendations)?$/i,
  /^\/api\/v1\/legal\/[a-z0-9_-]+$/i,
  /^\/media\/product-images\/products\/[a-z0-9-]+(?:\/[a-z0-9_.-]+)+$/i,
  /^\/_next\/static\/(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+$/i,
];

const revalidationHeaders = ['x-isr', 'x-prerender-revalidate', 'x-prerender-revalidate-if-generated'];

const omittedHeaders = new Set([
  'authorization', 'cookie', 'x-http-method', 'x-http-method-override',
  'x-method-override', 'x-original-url', 'x-rewrite-url', 'x-matched-path',
  ...revalidationHeaders,
]);

const privatePath = /^\/(?:api\/(?:v\d+\/)?)?(?:account|auth|admin|orders|cart|checkout)(?:\/|$)/i;
const apiPath = /^\/api(?:\/|$)/i;
const supabaseSessionCookie = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=/;

function asAnonymousRequest(request) {
  const headers = new Headers(request.headers);
  for (const name of request.headers.keys()) {
    if (omittedHeaders.has(name) || name.startsWith('x-middleware-') || name.startsWith('x-invoke-')) {
      headers.delete(name);
    }
  }
  return new Request(request, { headers });
}

function rejectPreviewRequest(status) {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
  });
  if (status === 405) {
    headers.set('Allow', 'GET, HEAD');
  }
  return new Response(null, { status, headers });
}

function isPrivateRequest(request, path) {
  let route = path;
  if (route.includes('%')) {
    try {
      route = decodeURIComponent(route);
    } catch {
      return true;
    }
  }
  return privatePath.test(route) || (apiPath.test(route) && (
    (request.method !== 'GET' && request.method !== 'HEAD')
    || request.headers.has('Authorization')
    || supabaseSessionCookie.test(request.headers.get('Cookie') ?? '')
  ));
}

function applyResponsePolicy(response, preview, privateResponse) {
  if (!preview && !privateResponse) {
    return response;
  }

  // Copy immutable headers without consuming the body or combining Set-Cookie headers.
  const marked = new Response(response.body, response);
  if (preview) {
    marked.headers.set('X-Robots-Tag', 'noindex');
  }
  if (privateResponse) {
    marked.headers.set('Cache-Control', 'private, no-store');
    for (const name of response.headers.keys()) {
      if (name === 'cdn-cache-control' || name.endsWith('-cdn-cache-control')
        || name === 'surrogate-control' || name === 'edge-control') {
        marked.headers.delete(name);
      }
    }
  }
  return marked;
}

export async function fetchWithImageFallback(worker, request, env, ctx) {
  if (request.method !== 'GET' || !env.IMAGES || new URL(request.url).pathname !== '/_next/image') {
    return worker.fetch(request, env, ctx);
  }

  try {
    return await worker.fetch(request, env, ctx);
  } catch (error) {
    if (error?.code !== 9422) {
      throw error;
    }
    // Images Free refuses new transformations at quota. OpenNext can serve the validated original.
    return worker.fetch(request, { ...env, IMAGES: undefined }, ctx);
  }
}

export async function handleWorkerRequest(worker, request, env, ctx) {
  const { hostname, pathname } = new URL(request.url);
  const preview = hostname.replace(/\.$/, '').endsWith('.workers.dev')
    || env.POPBOX_PREVIEW_READ_ONLY === true
    || env.POPBOX_PREVIEW_READ_ONLY === 'true';
  const path = pathname.replace(/\/$/, '') || '/';

  let upstreamRequest = request;
  if (preview) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return rejectPreviewRequest(405);
    }
    if (!publicPaths.has(path) && !publicPathPatterns.some((pattern) => pattern.test(path))) {
      return rejectPreviewRequest(404);
    }
    upstreamRequest = asAnonymousRequest(request);
  } else if (revalidationHeaders.some((name) => request.headers.has(name))) {
    const headers = new Headers(request.headers);
    for (const name of revalidationHeaders) {
      headers.delete(name);
    }
    upstreamRequest = new Request(request, { headers });
  }

  const response = await worker.fetch(upstreamRequest, env, ctx);
  const privateResponse = response.headers.has('Set-Cookie')
    || (preview && response.status >= 400)
    || isPrivateRequest(upstreamRequest, path);
  return applyResponsePolicy(response, preview, privateResponse);
}
