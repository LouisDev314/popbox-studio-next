import getEnvConfig from '@/configs/env';
import axios from 'axios';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

export const createHttpClient = () => {
  const baseURL = getEnvConfig().apiBaseUrl;
  const client = axios.create({ baseURL });
  responseInterceptor(client);
  requestInterceptor(client);
  return client;
}
