import nock from 'nock';
import { WSServer } from '@winstrike/ws-test-helper';

// should be imported before all
import { PPS_OPTIONS, startPPS } from './helpers';

import ProxyPaymentService from '../main';
import { StarTSP650 } from '../request-mocks/one-time';

afterAll(async () => {
  await WSServer.clean();
});

describe('main success cases', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'classic'>;

  beforeEach(async () => {
    server = new WSServer('ws://127.0.0.1:1234');
    await server.listening;
  });

  afterEach(async () => {
    await pps.stop();
    await server.close();
  });

  it('should create instance', () => {
    pps = new ProxyPaymentService('classic', PPS_OPTIONS);

    expect(pps).toBeInstanceOf(ProxyPaymentService);
  });

  it('should start and connect to printer', async () => {
    StarTSP650.mockStatus();
    pps = await startPPS('classic');

    expect(nock.isDone()).toEqual(true);
  });
});
