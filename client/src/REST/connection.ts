import type { DUser } from './types';

import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/dev',
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
export const devLogin = async (
  email: DUser['email'],
  name?: string
): Promise<{ sessionToken: string; user: DUser }> => {
  const data = (
    await axiosInstance.post<{ data: { sessionToken: string; user: DUser } }>('/login', {
      email,
      tokenType: 'dev',
      name,
    })
  )?.data?.data;
  if (data?.sessionToken != null) {
    axiosInstance.defaults.headers['Authorization'] = `Bearer ${data.sessionToken}`;
    return data;
  }

  throw new Error('Login failed');
};

export default axiosInstance;
