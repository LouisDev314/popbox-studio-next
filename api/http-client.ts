import getEnvConfig from '@/configs/env';
import axios from 'axios';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

export const httpClient = () => {
  const baseURL = getEnvConfig().apiBaseUrl;
  console.log('apiBaseUrl:', baseURL);
  const client = axios.create({ baseURL });
  responseInterceptor(client);
  requestInterceptor(client);
  return client;
}
