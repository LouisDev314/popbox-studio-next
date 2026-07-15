import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IBaseApiResponse } from '@/interfaces/api-response';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMocks }),
}));

import { CustomerAuthenticationError, customerRequest } from '@/lib/api/customer-client';

function successResponse(): AxiosResponse<IBaseApiResponse<{ ok: true }>> {
  return {
    config: {} as AxiosResponse['config'],
    data: {
      code: 200,
      data: { ok: true },
      message: 'OK',
      status: 'success',
      success: true,
    },
    headers: {},
    status: 200,
    statusText: 'OK',
  };
}

function tokenError(status: number, code = 'AUTH_TOKEN_INVALID') {
  return {
    isAxiosError: true,
    response: {
      data: {
        code: status,
        data: null,
        errors: { code },
        message: 'Authentication failed',
        status: 'error',
        success: false,
      },
      status,
    },
  };
}

function readAuthorization(config: AxiosRequestConfig) {
  return (config.headers as Record<string, string>).Authorization;
}

describe('customerRequest', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
    authMocks.refreshSession.mockReset();
    authMocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'initial-token' } },
      error: null,
    });
    authMocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed-token' } },
      error: null,
    });
  });

  it('attaches the bearer token and retries exactly once after a 401 AUTH_TOKEN_INVALID response', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(tokenError(401))
      .mockResolvedValueOnce(successResponse());

    await expect(customerRequest(request)).resolves.toMatchObject({ status: 200 });

    expect(request).toHaveBeenCalledTimes(2);
    expect(readAuthorization(request.mock.calls[0][0])).toBe('Bearer initial-token');
    expect(readAuthorization(request.mock.calls[1][0])).toBe('Bearer refreshed-token');
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for a non-401 response or a different backend code', async () => {
    const wrongStatus = vi.fn().mockRejectedValue(tokenError(400));
    await expect(customerRequest(wrongStatus)).rejects.toMatchObject({ response: { status: 400 } });

    const wrongCode = vi.fn().mockRejectedValue(tokenError(401, 'AUTH_REQUIRED'));
    await expect(customerRequest(wrongCode)).rejects.toMatchObject({ response: { status: 401 } });

    expect(authMocks.refreshSession).not.toHaveBeenCalled();
  });

  it('never retries a second invalid-token response', async () => {
    const request = vi.fn().mockRejectedValue(tokenError(401));

    await expect(customerRequest(request)).rejects.toMatchObject({ response: { status: 401 } });

    expect(request).toHaveBeenCalledTimes(2);
    expect(authMocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('fails without invoking the request when no customer session exists', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const request = vi.fn();

    await expect(customerRequest(request)).rejects.toBeInstanceOf(CustomerAuthenticationError);
    expect(request).not.toHaveBeenCalled();
  });
});
