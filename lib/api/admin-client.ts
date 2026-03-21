import axios from 'axios';
import { createClient } from '@/lib/supabase/client';
import getEnvConfig from '@/configs/env';

const API_BASE_URL = getEnvConfig().apiBaseUrl;

/**
 * Axios instance pre-configured for admin API routes.
 * Handles attaching the Supabase access_token and redirecting on 401.
 */
export const adminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if session exists
adminClient.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 and 403 responses
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // Redirect to login if unauthorized
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
      } else if (error.response.status === 403) {
        // Standardize "No admin access" error to be caught by UI
        console.error('No admin access');
      }
    }
    return Promise.reject(error);
  }
);
