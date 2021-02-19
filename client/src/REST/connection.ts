import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/dev',
  timeout: 1000,
  headers: {
    Authorization: 'Bearer [todo]',
  },
});

axiosRetry(axiosInstance, { retries: 3, shouldResetTimeout: true });

export default axiosInstance;
