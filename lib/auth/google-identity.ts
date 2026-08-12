'use client';

export interface IGoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

type GoogleCredentialHandler = (
  response: IGoogleCredentialResponse,
  nonce: string,
) => void;

interface IGoogleIdentityConfiguration {
  auto_select: boolean;
  button_auto_select: boolean;
  callback: (response: IGoogleCredentialResponse) => void;
  client_id: string;
  nonce: string;
  use_fedcm_for_button: boolean;
  ux_mode: 'popup';
}

interface IGoogleButtonConfiguration {
  logo_alignment: 'left';
  shape: 'pill';
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

interface IGoogleIdentityInitialization {
  api: IGoogleIdentityApi;
  clientId: string;
  nonce: string;
}

export interface IGoogleNoncePair {
  hashedNonce: string;
  nonce: string;
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptLoadPromise: Promise<IGoogleIdentityApi> | null = null;
let initializationPromise: Promise<IGoogleIdentityInitialization> | null = null;
let initialization: IGoogleIdentityInitialization | null = null;
let activeCredentialHandler: GoogleCredentialHandler | null = null;

function readGoogleIdentityApi(): IGoogleIdentityApi | null {
  const api = (window as unknown as IGoogleIdentityGlobal).google?.accounts?.id;

  return api && typeof api.initialize === 'function' && typeof api.renderButton === 'function'
    ? api
    : null;
}

export async function createGoogleIdentityNonce(): Promise<IGoogleNoncePair> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...randomBytes));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { hashedNonce, nonce };
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
  credentialHandler: GoogleCredentialHandler,
): Promise<IGoogleIdentityApi> {
  activeCredentialHandler = credentialHandler;

  if (initialization && initialization.clientId !== clientId) {
    throw new Error('Google Identity Services was initialized with a different client ID.');
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const [api, noncePair] = await Promise.all([
        loadGoogleIdentityServices(),
        createGoogleIdentityNonce(),
      ]);

      const nextInitialization: IGoogleIdentityInitialization = {
        api,
        clientId,
        nonce: noncePair.nonce,
      };
      initialization = nextInitialization;

      api.initialize({
        auto_select: false,
        button_auto_select: false,
        callback: (response) => {
          const currentInitialization = initialization;
          if (currentInitialization) {
            activeCredentialHandler?.(response, currentInitialization.nonce);
          }
        },
        client_id: clientId,
        nonce: noncePair.hashedNonce,
        use_fedcm_for_button: true,
        ux_mode: 'popup',
      });

      return nextInitialization;
    })().catch((error: unknown) => {
      initialization = null;
      initializationPromise = null;
      throw error;
    });
  }

  const currentInitialization = await initializationPromise;
  if (currentInitialization.clientId !== clientId) {
    throw new Error('Google Identity Services was initialized with a different client ID.');
  }

  return currentInitialization.api;
}

export function releaseGoogleCredentialHandler(credentialHandler: GoogleCredentialHandler): void {
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
    shape: 'pill',
    size: 'large',
    text: 'continue_with',
    theme: 'outline',
    type: 'standard',
    width,
  });
}
