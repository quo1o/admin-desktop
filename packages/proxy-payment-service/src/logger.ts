import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
import { inTestEnvironment } from './helpers';

/* Use 'inTestEnvironment' to disable logging in tests because logs 
 * obstruct to read Jest logs
 */

function log (level: 'log' | 'info' | 'warn' | 'error', message: string, ...params: any[]) {
  if (!inTestEnvironment()) {
    // eslint-disable-next-line no-console
    console[level](message, ...params);
  }
}

function logRequests (axiosInstance: AxiosInstance = axios) {
  if (!inTestEnvironment()) {
    axiosInstance.interceptors.request.use(AxiosLogger.requestLogger, AxiosLogger.errorLogger);
    axiosInstance.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);
  }
}

export { log, logRequests };
