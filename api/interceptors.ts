import { AxiosInstance } from 'axios';

export const responseInterceptor = (axios: AxiosInstance) => {
  axios.interceptors.response.use();
};

export const requestInterceptor = (axios: AxiosInstance) => {
  axios.interceptors.request.use(async (config) => {
    return config;
  });
};
