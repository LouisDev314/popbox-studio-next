import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { expect, test as base } from '@playwright/test';

function sendJson(response: ServerResponse, data: unknown, status = 200) {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, apikey, x-client-info',
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(data));
}

function apiData(data: unknown) {
  return { status: 'success', code: 200, success: true, message: 'OK', data };
}

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key, apikey, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Origin': 'http://localhost:3001',
    });
    response.end();
    return;
  }

  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1:4010').pathname;

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
}

async function startMockServices() {
  const server = createServer(handleRequest);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(4010, '127.0.0.1', resolve);
  });
  return server;
}

export const test = base.extend<{ mockServices: void }>({
  mockServices: [async ({}, use) => {
    const server = await startMockServices();
    await use();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }, { auto: true }],
});

export { expect };
