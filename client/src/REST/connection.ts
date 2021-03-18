import type { DUser, RequestContext } from '../types';

import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_AC_API_URI ?? 'http://localhost:3000/dev',
  timeout: 1000,
  headers: {},
});

axiosRetry(axiosInstance, { retries: 3, shouldResetTimeout: true });

export const setRequestContext = (context?: RequestContext): void => {
  if (context?.sessionToken != null) {
    axiosInstance.defaults.headers['Authorization'] = `Bearer ${context.sessionToken}`;
  }

  if (context?.baseURL != null) {
    axiosInstance.defaults.baseURL = context.baseURL;
  }
};

/**
 * Attempts to login. On success, stores the token.
 *
 * @param email the user's email address
 * @param name optional, sets the name of the user
 * @param context modifies axios request metadata
 */
export const devLogin = async (
  email: DUser['email'],
  name?: string,
  context?: RequestContext
): Promise<{ sessionToken: string; user: DUser }> => {
  setRequestContext(context);

  const data = (
    await axiosInstance.post<{ data: { sessionToken: string; user: DUser } }>('/login', {
      email,
      tokenType: 'dev',
      name,
    })
  )?.data?.data;
  if (data?.sessionToken == null) {
    throw new Error('Login failed');
  }

  setRequestContext({ sessionToken: data.sessionToken });
  return data;
};

/**
 * Attempts to login. On success, stores the token.
 *
 * @param email the user's email address
 * @param name optional, sets the name of the user
 * @param context modifies axios request metadata
 */
export const login = async (
  idToken: string,
  context?: RequestContext
): Promise<{ sessionToken: string; user: DUser }> => {
  setRequestContext(context);

  const data = (
    await axiosInstance.post<{ data: { sessionToken: string; user: DUser } }>('/login', {
      idToken,
      tokenType: 'google',
    })
  )?.data?.data;
  if (data?.sessionToken == null) {
    throw new Error('Login failed');
  }

  setRequestContext({ sessionToken: data.sessionToken });
  return data;
};

export default axiosInstance;
