function normalizeRequiredUrl(value: string, variableName: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${variableName} must be a valid absolute URL.`);
  }
}

function resolveApiBaseUrl(): string {
  const configuredValue = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredValue) {
    return normalizeRequiredUrl(configuredValue, 'NEXT_PUBLIC_API_BASE_URL');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required in production.');
  }

  return 'http://localhost:3000';
}

const publicEnvConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableDefaultKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
  isSiteOpen: process.env.NEXT_PUBLIC_IS_SITE_OPEN !== 'false',
};

const getPublicEnvConfig = () => {
  return Object.freeze({
    ...publicEnvConfig,
  });
};

export default getPublicEnvConfig;
