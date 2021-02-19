import type { DUser } from './types';

import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:4000/dev',
  timeout: 1000,
  headers: {},
});

axiosRetry(axiosInstance, { retries: 3, shouldResetTimeout: true });

/**
 * Attempts to login. On success, stores the token.
 *
 * @param email the user's email address
 * @param name optional, sets the name of the user
 */
export const devLogin = async (email: DUser['email'], name?: string): Promise<DUser> => {
  const res = await axios.post('/login', { email, tokenType: 'dev', name });
  if (res.data?.sessionToken != null) {
    axiosInstance.defaults.headers['Authorization'] = `Bearer ${res.data.sessionToken}`;
    return res.data.user;
  }

  throw new Error('Login failed');
};

export default axiosInstance;
