import getEnvConfig from '@/utils/config/env';
import axios from 'axios';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

export const httpClient = () => {
  const baseURL = getEnvConfig().apiBaseUrl;
  const client = axios.create({ baseURL });
  responseInterceptor(client);
  requestInterceptor(client);
  return client;
}
