import * as Sentry from '@sentry/node';
import { log } from './logger';

function reportError (e: Error, prefix?: string) {
  log('error', `${prefix ? `${prefix} ` : ''}${e.message}`);
  Sentry.captureException(e);
}

export { reportError };
