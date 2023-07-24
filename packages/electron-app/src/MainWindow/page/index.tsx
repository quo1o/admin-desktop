import { h, render } from 'preact';

import { initSentry } from './sentry';
import App from './components/App';
import getGlobal from './get-global';
import { exposePpsId, exposeEndpointId } from './expose-params';

const { config } = getGlobal();

if (config.SENTRY_DSN && config.PPS_ID) initSentry(config.SENTRY_DSN, config.PPS_ID);
if (config.BOOKING_ADMIN_URL) {
  exposePpsId(config.BOOKING_ADMIN_URL);
  exposeEndpointId(config.BOOKING_ADMIN_URL);
}

render(<App />, document.getElementById('root') as HTMLDivElement);
