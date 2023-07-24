import faker from 'faker';
import nock from 'nock';
import type { TCurrency } from '@winstrike/pps-typings/terminal';
import { WSServer } from '@winstrike/ws-test-helper';

// should be imported before all
import { startPPSAndWaitInitMessage, PPS_OPTIONS, mockSbPilotSendCommand } from '../helpers';

import type ProxyPaymentService from '../../main';
import { POSProxy } from '../../request-mocks/one-time';
import { PAY_ERROR_MESSAGE } from '../../POSProxy';
import { StarTSP650 } from '../../request-mocks/one-time';

describe('success cases', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'classic'>;

  beforeEach(async () => {
    server = new WSServer('ws://127.0.0.1:1234');
    await server.listening;
    StarTSP650.mockStatus();
  });

  afterEach(async () => {
    await pps.stop();
    await server.close();
  });

  it('should make payment with POSProxy', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const amount = faker.random.number({ min: 1, precision: 0.01 });
    const currency = 'RUB';
    const invoiceId = faker.random.number(99999).toString();

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    POSProxy.mockPay(amount, currency, invoiceId);
    await server.send({ type: 'pay', body: { amount, currency } });

    await expect(server).toReceiveMessage({ type: 'pay', status: 'success', body: { invoiceId } });
    expect(nock.isDone()).toEqual(true);
  });

  describe('SbPilot operations', () => {
    let ppsId: string;
    let amount: number;
    let currency: TCurrency;
    let invoiceId: string;

    beforeEach(async () => {
      ppsId = faker.random.alphaNumeric(6);
      amount = faker.random.number({ min: 1, precision: 0.01 });
      currency = 'RUB';
      invoiceId = faker.random.number(99999).toString();

      mockSbPilotSendCommand({ referenceNumber: invoiceId });

      pps = await startPPSAndWaitInitMessage('classic', server, {
        ppsId,
        terminal: {
          ...PPS_OPTIONS.terminal,
          acquiring: 'sber',
        },
      });
    });

    it('should make payment', async () => {
      const type = 'pay';

      await server.send({ type, body: { amount, currency } });

      await expect(server).toReceiveMessage({
        type, status: 'success', body: { invoiceId },
      });
    });

    const returnTypes = ['refund', 'cancel'];
    it.each(returnTypes)('should make %s', async (type) => {
      await server.send({ type, body: { invoiceId, amount, currency } });
  
      await expect(server).toReceiveMessage({ type, status: 'success' });
    });
  });
});

describe('error cases', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'classic'>;

  beforeEach(async () => {
    server = new WSServer('ws://127.0.0.1:1234');
    await server.listening;
    StarTSP650.mockStatus();
  });

  afterEach(async () => {
    nock.cleanAll();
    await pps.stop();
    await server.close();
  });

  it('should return validation errors', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const amount = 0;
    const currency = 'UAH' as TCurrency;
    const expectedMessage = [
      'amount must be number more than 0.01',
      'currency must be string with one of valid values: RUB, USD, EUR',
    ];

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    POSProxy.mockPay(amount, currency, faker.random.number(99999).toString());
    await server.send({ type: 'pay', body: { amount, currency } });

    await expect(server).toReceiveMessage({
      type: 'pay',
      status: 'error',
      body: { message: expectedMessage },
    });
    expect(nock.isDone()).toEqual(false);
  });

  const humanizedErrorCases = [ ...Object.entries(PAY_ERROR_MESSAGE), ['unknown', undefined]];
  it.each(humanizedErrorCases)('should return humanized error for code \'%s\'', async (code, message) => {
    const amount = parseFloat(faker.random.number({ min: 1, precision: 0.01 }).toFixed(2));
    const currency = 'RUB';

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId: faker.random.alphaNumeric(6) });

    POSProxy.mockPay(amount, currency, faker.random.number(99999).toString(), code);
    await server.send({ type: 'pay', body: { amount, currency } });

    await expect(server).toReceiveMessage({
      type: 'pay',
      status: 'error',
      body: {
        message: `Terminal returned error '${code}'`,
        humanizedMessage:
          `[Терминал] ${message || 'Неизвестная ошибка'}`,
      },
    });
    expect(nock.isDone()).toEqual(true);
  });
});
