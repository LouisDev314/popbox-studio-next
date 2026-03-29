import axios from 'axios';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

const httpClient = axios.create({
  baseURL: '',
  headers: {
    Accept: 'application/json',
  },
  timeout: 15_000,
  withCredentials: true,
});

requestInterceptor(httpClient);
responseInterceptor(httpClient);

export default httpClient;
