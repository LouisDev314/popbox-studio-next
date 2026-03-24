const envConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableDefaultKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
  isSiteOpen: Boolean(process.env.NEXT_PUBLIC_IS_SITE_OPEN === 'true') || true,
};

const getEnvConfig = () => {
  return Object.freeze({
    ...envConfig,
  });
};

export default getEnvConfig;
