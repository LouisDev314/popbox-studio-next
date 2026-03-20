import axios from 'axios';
import getEnvConfig from '@/configs/env';
import { requestInterceptor, responseInterceptor } from '@/api/interceptors';

const baseURL = getEnvConfig().apiBaseUrl;

const httpClient = axios.create({ baseURL, withCredentials: true });

requestInterceptor(httpClient);
responseInterceptor(httpClient);

export default httpClient;
