import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface IMockGoogleGlobal {
  google?: {
    accounts?: {
      id?: {
        initialize: ReturnType<typeof vi.fn>;
        renderButton: ReturnType<typeof vi.fn>;
      };
    };
  };
}

function installGoogleApi() {
  const api = {
    initialize: vi.fn(),
    renderButton: vi.fn(),
  };
  (window as unknown as IMockGoogleGlobal).google = { accounts: { id: api } };
  return api;
}

async function sha256Hex(value: string) {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('Google Identity Services browser boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.replaceChildren();
    delete (window as unknown as IMockGoogleGlobal).google;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
  });

  it('injects the current GIS script once for concurrent callers', async () => {
    const { loadGoogleIdentityServices } = await import('@/lib/auth/google-identity');
    const firstLoad = loadGoogleIdentityServices();
    const secondLoad = loadGoogleIdentityServices();
    const script = document.querySelector<HTMLScriptElement>('#google-identity-services');

    expect(script).toHaveAttribute('src', 'https://accounts.google.com/gsi/client');
    expect(script?.async).toBe(true);
    expect(document.querySelectorAll('#google-identity-services')).toHaveLength(1);

    const api = installGoogleApi();
    script?.dispatchEvent(new Event('load'));

    await expect(firstLoad).resolves.toBe(api);
    await expect(secondLoad).resolves.toBe(api);
  });

  it('initializes once with a hashed nonce and returns the matching raw nonce to the callback', async () => {
    const api = installGoogleApi();
    const { initializeGoogleIdentityServices } = await import('@/lib/auth/google-identity');
    const firstCredentialHandler = vi.fn();
    const currentCredentialHandler = vi.fn();

    await Promise.all([
      initializeGoogleIdentityServices(
        'client-id.apps.googleusercontent.com',
        firstCredentialHandler,
      ),
      initializeGoogleIdentityServices(
        'client-id.apps.googleusercontent.com',
        currentCredentialHandler,
      ),
    ]);

    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(api.initialize).toHaveBeenCalledWith(expect.objectContaining({
      auto_select: false,
      button_auto_select: false,
      client_id: 'client-id.apps.googleusercontent.com',
      nonce: expect.stringMatching(/^[a-f\d]{64}$/),
      ux_mode: 'popup',
    }));

    const initializeConfig = api.initialize.mock.calls[0][0] as {
      callback: (response: { credential: string }) => void;
      nonce: string;
      use_fedcm_for_button?: boolean;
    };
    expect(initializeConfig).not.toHaveProperty('use_fedcm_for_button');
    initializeConfig.callback({ credential: 'credential' });

    expect(firstCredentialHandler).not.toHaveBeenCalled();
    expect(currentCredentialHandler).toHaveBeenCalledWith(
      { credential: 'credential' },
      expect.any(String),
    );
    const rawNonce = currentCredentialHandler.mock.calls[0][1] as string;
    expect(await sha256Hex(rawNonce)).toBe(initializeConfig.nonce);
  });

  it('reuses the initialized nonce instead of generating a new one for rerenders', async () => {
    const api = installGoogleApi();
    const { initializeGoogleIdentityServices } = await import('@/lib/auth/google-identity');
    const firstCredentialHandler = vi.fn();
    const currentCredentialHandler = vi.fn();

    await initializeGoogleIdentityServices(
      'client-id.apps.googleusercontent.com',
      firstCredentialHandler,
    );
    const originalConfiguration = api.initialize.mock.calls[0][0] as {
      callback: (response: { credential: string }) => void;
      nonce: string;
    };
    await initializeGoogleIdentityServices(
      'client-id.apps.googleusercontent.com',
      currentCredentialHandler,
    );
    originalConfiguration.callback({ credential: 'credential' });

    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(currentCredentialHandler.mock.calls[0][1]).toEqual(expect.any(String));
    expect(await sha256Hex(currentCredentialHandler.mock.calls[0][1] as string))
      .toBe(originalConfiguration.nonce);
  });

  it('renders a full-width official pill button through Google', async () => {
    const api = installGoogleApi();
    const { renderGoogleIdentityButton } = await import('@/lib/auth/google-identity');
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));

    renderGoogleIdentityButton(api, parent, 360);

    expect(parent.childElementCount).toBe(0);
    expect(api.renderButton).toHaveBeenCalledWith(parent, {
      logo_alignment: 'left',
      shape: 'pill',
      size: 'large',
      text: 'continue_with',
      theme: 'outline',
      type: 'standard',
      width: 360,
    });
  });

  it('rejects safely when the GIS script fails to load', async () => {
    const { loadGoogleIdentityServices } = await import('@/lib/auth/google-identity');
    const loading = loadGoogleIdentityServices();
    document.querySelector<HTMLScriptElement>('#google-identity-services')
      ?.dispatchEvent(new Event('error'));

    await expect(loading).rejects.toThrow('Google Identity Services failed to load.');
  });
});
