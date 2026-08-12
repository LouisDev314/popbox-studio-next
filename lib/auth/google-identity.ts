'use client';

export interface IGoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface IGoogleIdentityConfiguration {
  auto_select: boolean;
  button_auto_select: boolean;
  callback: (response: IGoogleCredentialResponse) => void;
  client_id: string;
  use_fedcm_for_button: boolean;
  ux_mode: 'popup';
}

interface IGoogleButtonConfiguration {
  logo_alignment: 'left';
  shape: 'rectangular';
  size: 'large';
  text: 'continue_with';
  theme: 'outline';
  type: 'standard';
  width: number;
}

export interface IGoogleIdentityApi {
  initialize: (configuration: IGoogleIdentityConfiguration) => void;
  renderButton: (parent: HTMLElement, configuration: IGoogleButtonConfiguration) => void;
}

interface IGoogleIdentityGlobal {
  google?: {
    accounts?: {
      id?: IGoogleIdentityApi;
    };
  };
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptLoadPromise: Promise<IGoogleIdentityApi> | null = null;
let initializedClientId: string | null = null;
let activeCredentialHandler: ((response: IGoogleCredentialResponse) => void) | null = null;

function readGoogleIdentityApi(): IGoogleIdentityApi | null {
  const api = (window as unknown as IGoogleIdentityGlobal).google?.accounts?.id;

  return api && typeof api.initialize === 'function' && typeof api.renderButton === 'function'
    ? api
    : null;
}

export function loadGoogleIdentityServices(): Promise<IGoogleIdentityApi> {
  const availableApi = readGoogleIdentityApi();
  if (availableApi) {
    return Promise.resolve(availableApi);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);
    const script = existingScript instanceof HTMLScriptElement
      ? existingScript
      : document.createElement('script');

    const handleLoad = () => {
      const api = readGoogleIdentityApi();
      if (!api) {
        scriptLoadPromise = null;
        script.remove();
        reject(new Error('Google Identity Services loaded without its browser API.'));
        return;
      }

      resolve(api);
    };

    const handleError = () => {
      scriptLoadPromise = null;
      script.remove();
      reject(new Error('Google Identity Services failed to load.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.async = true;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      document.head.appendChild(script);
    }
  });

  return scriptLoadPromise;
}

export async function initializeGoogleIdentityServices(
  clientId: string,
  credentialHandler: (response: IGoogleCredentialResponse) => void,
): Promise<IGoogleIdentityApi> {
  activeCredentialHandler = credentialHandler;
  const api = await loadGoogleIdentityServices();

  if (initializedClientId && initializedClientId !== clientId) {
    throw new Error('Google Identity Services was initialized with a different client ID.');
  }

  if (!initializedClientId) {
    api.initialize({
      auto_select: false,
      button_auto_select: false,
      callback: (response) => activeCredentialHandler?.(response),
      client_id: clientId,
      use_fedcm_for_button: true,
      ux_mode: 'popup',
    });
    initializedClientId = clientId;
  }

  return api;
}

export function releaseGoogleCredentialHandler(
  credentialHandler: (response: IGoogleCredentialResponse) => void,
): void {
  if (activeCredentialHandler === credentialHandler) {
    activeCredentialHandler = null;
  }
}

export function renderGoogleIdentityButton(
  api: IGoogleIdentityApi,
  parent: HTMLElement,
  width: number,
): void {
  parent.replaceChildren();
  api.renderButton(parent, {
    logo_alignment: 'left',
    shape: 'rectangular',
    size: 'large',
    text: 'continue_with',
    theme: 'outline',
    type: 'standard',
    width,
  });
}
