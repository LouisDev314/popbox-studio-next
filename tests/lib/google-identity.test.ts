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

describe('Google Identity Services browser boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.replaceChildren();
    delete (window as unknown as IMockGoogleGlobal).google;
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

  it('initializes GIS once, enables the FedCM button flow, and renders through Google', async () => {
    const api = installGoogleApi();
    const {
      initializeGoogleIdentityServices,
      renderGoogleIdentityButton,
    } = await import('@/lib/auth/google-identity');
    const firstCredentialHandler = vi.fn();
    const currentCredentialHandler = vi.fn();

    await initializeGoogleIdentityServices('client-id.apps.googleusercontent.com', firstCredentialHandler);
    await initializeGoogleIdentityServices('client-id.apps.googleusercontent.com', currentCredentialHandler);

    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(api.initialize).toHaveBeenCalledWith(expect.objectContaining({
      auto_select: false,
      button_auto_select: false,
      client_id: 'client-id.apps.googleusercontent.com',
      use_fedcm_for_button: true,
      ux_mode: 'popup',
    }));

    const initializeConfig = api.initialize.mock.calls[0][0] as {
      callback: (response: { credential: string }) => void;
    };
    initializeConfig.callback({ credential: 'credential' });
    expect(firstCredentialHandler).not.toHaveBeenCalled();
    expect(currentCredentialHandler).toHaveBeenCalledWith({ credential: 'credential' });

    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));
    renderGoogleIdentityButton(api, parent, 360);

    expect(parent.childElementCount).toBe(0);
    expect(api.renderButton).toHaveBeenCalledWith(parent, {
      logo_alignment: 'left',
      shape: 'rectangular',
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
