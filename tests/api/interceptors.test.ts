import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { responseInterceptor } from '@/api/interceptors';

const adminAuthMocks = vi.hoisted(() => ({
  getAdminAccessToken: vi.fn(),
  notifyAdminAuthFailure: vi.fn(),
}));

vi.mock('@/lib/auth/admin-session-client', () => adminAuthMocks);

function response(config: InternalAxiosRequestConfig, status = 200) {
  return {
    config,
    data: { status: 'success', code: status, success: true, message: 'OK', data: null },
    headers: {},
    status,
    statusText: status === 200 ? 'OK' : 'Error',
  };
}

function rejectStatus(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError(
    'Request failed',
    undefined,
    config,
    undefined,
    response(config, status),
  );
}

describe('admin response authentication interceptor', () => {
  beforeEach(() => {
    adminAuthMocks.getAdminAccessToken.mockReset();
    adminAuthMocks.notifyAdminAuthFailure.mockReset();
    adminAuthMocks.getAdminAccessToken.mockResolvedValue('refreshed-token');
  });

  it('refreshes and retries one expired-token 401', async () => {
    const client = axios.create();
    responseInterceptor(client);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (adapter.mock.calls.length === 1) {
        rejectStatus(config, 401);
      }
      return response(config);
    });

    const result = await client.get('/api/v1/admin/products', {
      adapter,
      headers: new AxiosHeaders({ Authorization: 'Bearer expired-token' }),
    });

    expect(result.status).toBe(200);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adminAuthMocks.getAdminAccessToken).toHaveBeenCalledWith(true);
    expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer refreshed-token');
    expect(adminAuthMocks.notifyAdminAuthFailure).not.toHaveBeenCalled();
  });

  it('logs out after the retried request is still 401', async () => {
    const client = axios.create();
    responseInterceptor(client);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => rejectStatus(config, 401));

    await expect(client.get('/api/v1/admin/products', { adapter })).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adminAuthMocks.notifyAdminAuthFailure).toHaveBeenCalledWith('unauthenticated');
  });

  it('does not refresh or destroy auth state for a 403 authorization failure', async () => {
    const client = axios.create();
    responseInterceptor(client);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => rejectStatus(config, 403));

    await expect(client.get('/api/v1/admin/products', { adapter })).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(adminAuthMocks.getAdminAccessToken).not.toHaveBeenCalled();
    expect(adminAuthMocks.notifyAdminAuthFailure).toHaveBeenCalledWith('forbidden');
  });

  it('does not turn temporary network failures into logout', async () => {
    const client = axios.create();
    responseInterceptor(client);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    });

    await expect(client.get('/api/v1/admin/products', { adapter })).rejects.toMatchObject({
      code: 'ERR_NETWORK',
    });

    expect(adminAuthMocks.getAdminAccessToken).not.toHaveBeenCalled();
    expect(adminAuthMocks.notifyAdminAuthFailure).not.toHaveBeenCalled();
  });
});
