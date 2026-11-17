import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

// CI validates prerendering against a local fixture, independent of backend uptime.
// Production builds still use the configured backend and preserve ISR error handling.
const fixtures = new Map([
  ['/api/v1/home', { featured: [], trendingNow: [], allProductsPreview: [] }],
  ['/api/v1/collections', []],
  ['/api/v1/tags', []],
  ['/api/v1/products', { items: [], nextCursor: null }],
  ['/api/v1/legal/faq', []],
]);
const unexpectedRequests = new Set();
const origin = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const known = request.method === 'GET' && fixtures.has(path);
  if (!known) unexpectedRequests.add(`${request.method} ${path}`);
  const status = known ? 200 : 404;
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    status: known ? 'success' : 'error',
    code: status,
    success: known,
    data: known ? fixtures.get(path) : null,
  }));
});

try {
  assert.ok(process.env.npm_execpath, 'Run with pnpm check:ci');
  await new Promise((resolve, reject) => {
    origin.once('error', reject);
    origin.listen(0, '127.0.0.1', resolve);
  });
  const apiUrl = `http://127.0.0.1:${origin.address().port}`;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [process.env.npm_execpath, 'check'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: apiUrl,
        NEXT_PUBLIC_IS_SITE_OPEN: 'true',
      },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm check failed (${signal ?? code})`));
    });
  });
  assert.equal(unexpectedRequests.size, 0, `Missing CI fixtures: ${[...unexpectedRequests].join(', ')}`);
} finally {
  origin.closeAllConnections();
  await new Promise((resolve) => origin.close(resolve));
}
