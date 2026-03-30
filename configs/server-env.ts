import 'server-only';

import getPublicEnvConfig from '@/configs/public-env';

const serverEnvConfig = {
  ...getPublicEnvConfig(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
};

const getServerEnvConfig = () => {
  return Object.freeze({
    ...serverEnvConfig,
  });
};

export default getServerEnvConfig;
