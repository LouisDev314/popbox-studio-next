import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { expect, test as base } from '@playwright/test';

interface IAuthMockState {
  profileRequests: number;
  reset: () => void;
}

const confirmedAt = '2026-07-15T18:00:00.000Z';
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
  return [
    encodeJwtPart({ alg: 'HS256', typ: 'JWT' }),
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
    'e2e-signature',
  ].join('.');
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
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(data));
}

function apiData(data: unknown) {
  return { status: 'success', code: 200, success: true, message: 'OK', data };
}

function createRequestHandler(state: IAuthMockState) {
  return async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, apikey, x-client-info, x-supabase-api-version',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': 'http://localhost:3001',
      });
      response.end();
      return;
    }

  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1:4010');
  const pathname = requestUrl.pathname;

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
      'Access-Control-Allow-Origin': 'http://localhost:3001',
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
    sendJson(response, apiData({ items: [], nextCursor: null }));
    return;
  }

  if (pathname === '/api/v1/account/kuji-history') {
    sendJson(response, apiData({ items: [], nextCursor: null }));
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
  authMock: async ({}, use) => {
    const state: IAuthMockState = {
      profileRequests: 0,
      reset() {
        this.profileRequests = 0;
      },
    };
    await use(state);
  },
  mockServices: [async ({ authMock }, use) => {
    const server = await startMockServices(authMock);
    await use();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }, { auto: true }],
});

export { expect };
