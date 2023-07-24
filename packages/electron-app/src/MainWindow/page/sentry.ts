import * as Sentry from '@sentry/browser';

function initSentry (dsn: string, ppsId: string) {
  Sentry.init({ dsn });
  Sentry.configureScope((scope) => {
    scope.setUser({ id: ppsId });
    scope.setTag('process', 'browser');
  });
}

export { initSentry };
