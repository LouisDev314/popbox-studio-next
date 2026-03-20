import axios from 'axios';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

const httpClient = axios.create({
  baseURL: '',
  withCredentials: true,
});

requestInterceptor(httpClient);
responseInterceptor(httpClient);

export default httpClient;
