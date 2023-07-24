import axios, { AxiosResponse } from 'axios';

import { inTestEnvironment } from '.';

type TOptions<T> = {
  url: string;
  maxRetryCount?: number;
  interval?: number;
  errorMessage: string;
  checkResult: (result: AxiosResponse<T>) => boolean;
};

export default function healthcheck <T = unknown> ({
  url,
  maxRetryCount = 3,
  interval = 3000,
  errorMessage,
  checkResult,
}: TOptions<T>): Promise<AxiosResponse<T>> {
  let retryCount = 0;
  return new Promise((resolve, reject) => {
    const request = async () => {
      retryCount += 1;

      const result = await axios.get(url, {
        validateStatus: () => true,
      }).catch(() => {});

      if (result && checkResult(result)) return result;
      else if (retryCount === maxRetryCount) throw new Error(errorMessage);
    };

    const scheduleRequest = () => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        request().then(result => result ? resolve(result) : scheduleRequest(), reject);
      }, inTestEnvironment() ? 1000 : interval);
    };

    scheduleRequest();
  });
}
