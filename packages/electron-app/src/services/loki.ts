/* eslint-disable no-console */

import { LogMessage, LevelOption, LogLevel } from 'electron-log';
import Axios from 'axios';
import * as rax from 'retry-axios';
import * as Sentry from '@sentry/node';

type LokiLogLevel = typeof LOG_LEVELS extends ReadonlyArray<infer ElementType> ? ElementType : never;
type Logs = Array<[LokiLogLevel, number, string]>;

type LokiStream = {
  stream: {
    [key: string]: string;
  };
  values: Array<[string, string]>;
};
type LokiPushBody = {
  streams: LokiStream[];
};

const LOGS_LENGTH_TO_SEND = 50;
const TIMEOUT_TO_SEND_LOGS_S = 30;
const MAX_LOGS_LENGTH = 500;
const LOG_LEVELS = ['error', 'warn', 'info'] as const;
const isAllowedLogLevel = (level: LogLevel): level is LokiLogLevel => LOG_LEVELS.includes(level as LokiLogLevel);

const axios = Axios.create({ timeout: 30000 });
axios.defaults.raxConfig = {
  instance: axios,
  retry: 10,
  noResponseRetries: 10,
  httpMethodsToRetry: ['POST'],
  statusCodesToRetry: [[100, 199], [400, 499], [500, 599]],
  onRetryAttempt: (err) => {
    const cfg = rax.getConfig(err);
    console.debug(`[Loki] Error message '${err.message}'`);
    console.debug(`[Loki] Error response data '${err.response?.data || 'unknown'}'`);
    console.debug(`[Loki] Request retry attempt #${cfg?.currentRetryAttempt || 'unknown'}`);
  },
};
rax.attach(axios);

const LOGS_STORE: {
  logs: Logs;
  isLocked: boolean;
  lock: () => boolean;
  unlock: () => boolean;
} = {
  logs: [],
  isLocked: false,
  lock () {
    if (this.isLocked) return false;
    console.debug('[Loki] Logs store locked');
    this.isLocked = true;
    return true;
  },
  unlock () {
    if (!this.isLocked) return false;
    console.debug('[Loki] Logs store unlocked');
    this.isLocked = false;
    return true;
  },
};

let isTimeoutStarted = false;

const electronLogToLoki = (message: LogMessage) => {
  if (!isTimeoutStarted) {
    setTimeoutToSendLogs();
    isTimeoutStarted = true;
  }

  if (!isAllowedLogLevel(message.level)) return;

  if (LOGS_STORE.logs.length >= MAX_LOGS_LENGTH) {
    console.debug(`[Loki] LOGS_STORE.logs size reached limit of ${MAX_LOGS_LENGTH} items`);
    return;
  }

  LOGS_STORE.logs.push([message.level, message.date.getTime() * 1000000, message.data.join(' ')]);

  if (LOGS_STORE.logs.length && LOGS_STORE.logs.length >= LOGS_LENGTH_TO_SEND) {
    const isLocked = LOGS_STORE.lock();
    console.debug('[Loki] Prevent length limit sending', !isLocked);
    if (!isLocked) return;

    const logsToSend = LOGS_STORE.logs.splice(0, LOGS_LENGTH_TO_SEND);

    sendToLoki(logsToSend)
      .then(() => console.debug('[Loki] Logs sent by length limit'))
      .catch(() => {
        LOGS_STORE.logs.splice(0, 0, ...logsToSend);
      })
      .finally(() => LOGS_STORE.unlock());
  }
};
electronLogToLoki.level = 'info' as LevelOption;

function setTimeoutToSendLogs () {
  const timeout = setTimeout(() => {
    clearTimeout(timeout);

    if (LOGS_STORE.logs.length) {
      const isLocked = LOGS_STORE.lock();
      console.debug('[Loki] Prevent timeout sending', !isLocked);
      if (!isLocked) return setTimeoutToSendLogs();

      const logsToSend = LOGS_STORE.logs
        .splice(
          0,
          LOGS_STORE.logs.length > LOGS_LENGTH_TO_SEND
            ? LOGS_LENGTH_TO_SEND
            : LOGS_STORE.logs.length,
        );

      sendToLoki(logsToSend)
        .then(() => console.debug('[Loki] Logs sent by timeout'))
        .catch(() => {
          LOGS_STORE.logs.splice(0, 0, ...logsToSend);
        })
        .finally(() => {
          LOGS_STORE.unlock();
          setTimeoutToSendLogs();
        });
    } else setTimeoutToSendLogs();
  }, TIMEOUT_TO_SEND_LOGS_S * 1000);
}

async function sendToLoki (logs: Logs) {
  const { LOKI_URL, LOKI_LOGIN, LOKI_PASSWORD } = global.config;

  if (!LOKI_URL || !LOKI_LOGIN || !LOKI_PASSWORD) {
    console.debug('[Loki] No some of Loki params');
    Sentry.captureMessage('No some of Loki params', Sentry.Severity.Error);
    return;
  }

  const body = {
    streams: LOG_LEVELS.reduce<LokiPushBody['streams']>((acc, level) => {
      const logsByLevel = logs.filter(l => l[0] === level);

      if (!logsByLevel.length) return acc;

      return [...acc, constructStream(level, logsByLevel)];
    }, []),
  };

  return axios.post(`${LOKI_URL}/loki/api/v1/push`, body, {
    auth: {
      username: LOKI_LOGIN,
      password: LOKI_PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .catch(e => {
      console.debug('[Loki]', e.message);
      Sentry.captureException(e);
      throw e;
    });
}

function constructStream (level: LokiLogLevel, logs: Logs) {
  return {
    stream: {
      ppsId: global.config.PPS_ID || 'unknown',
      level,
    },
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    values: logs
      .sort(([, a], [, b]) => a - b)
      .map(([, timestamp, message]) => [timestamp.toString(), message]) as LokiStream['values'],
      
  };
}

export { electronLogToLoki };
