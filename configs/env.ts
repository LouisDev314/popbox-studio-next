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

const envConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableDefaultKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
  isSiteOpen: process.env.NEXT_PUBLIC_IS_SITE_OPEN !== 'false',
};

const getEnvConfig = () => {
  return Object.freeze({
    ...envConfig,
  });
};

export default getEnvConfig;
