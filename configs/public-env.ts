function normalizeRequiredUrl(value: string, variableName: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${variableName} must be a valid absolute URL.`);
  }
}

function normalizeSiteUrlCandidate(value: string, variableName: string): string {
  const normalizedValue = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)
    ? value
    : `https://${value}`;

  return normalizeRequiredUrl(normalizedValue, variableName);
}

export function resolveApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configuredValue = env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredValue) {
    return normalizeRequiredUrl(configuredValue, 'NEXT_PUBLIC_API_BASE_URL');
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required in production.');
  }

  return 'http://localhost:3000';
}

export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configuredValue = env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredValue) {
    return normalizeRequiredUrl(configuredValue, 'NEXT_PUBLIC_SITE_URL');
  }

  const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionUrl) {
    return normalizeSiteUrlCandidate(productionUrl, 'VERCEL_PROJECT_PRODUCTION_URL');
  }

  const deploymentUrl = env.VERCEL_URL?.trim();

  if (deploymentUrl) {
    return normalizeSiteUrlCandidate(deploymentUrl, 'VERCEL_URL');
  }

  return 'http://localhost:3001';
}

const publicEnvConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  siteUrl: resolveSiteUrl(),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableDefaultKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY || '',
  isSiteOpen: process.env.NEXT_PUBLIC_IS_SITE_OPEN !== 'false',
};

const getPublicEnvConfig = () => {
  return Object.freeze({
    ...publicEnvConfig,
  });
};

export default getPublicEnvConfig;
