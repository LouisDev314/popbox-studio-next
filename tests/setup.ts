import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  vi,
} from 'vitest';
import { server } from './msw/server';
import { resetStores } from './test-utils';

// Unit SEO fixtures use one deterministic site origin, independent of local or
// production-build verification environment variables.
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3001');

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  resetStores();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});
