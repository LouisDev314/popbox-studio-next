const envConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
};

const getEnvConfig = () => {
  return Object.freeze({
    ...envConfig,
  });
};

export default getEnvConfig;
