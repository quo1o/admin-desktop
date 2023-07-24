import * as Sentry from '@sentry/node';

function initSentry () {
  Sentry.init({ dsn: global.config.SENTRY_DSN });
  Sentry.configureScope((scope) => {
    scope.setUser({ id: global.config.PPS_ID });
    scope.setTag('process', 'main');
  });
}

function reportError (e: Error, prefix?: string) {
  console.error(`${prefix ? `${prefix} ` : ''}${e.message}`);
  Sentry.captureException(e);
}

function captureMessage (msg: string, level?: 'info' | 'warn') {
  Sentry.captureMessage(msg, level === 'warn' ? Sentry.Severity.Warning : Sentry.Severity.Info);
}

export { initSentry, reportError, captureMessage };
