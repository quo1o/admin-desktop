/* eslint-disable no-console */

import nock from 'nock';
import faker from 'faker';
import { TCurrency } from '@winstrike/pps-typings/terminal';

import type { TPersistentMockObject } from './persistent';
import POSProxy from '../POSProxy';

const oneTime = {
  mockPay: (amount: number, currency: TCurrency, orderId: string, responseCode = '00') => {
    return nock(POSProxy.baseUrl)
      .post('/pay', {
        amount: amount.toString(),
        currency,
        posType: 'INPAS',
        posAddress: '192.168.1.1:27015',
      })
      .reply(200, (_, { amount: bodyAmount, currency: bodyCurrency }: Record<string, any>) => ({
        amount: bodyAmount,
        currency: bodyCurrency,
        responseCode,
        orderId,
      }));
  },
};

const persistent: TPersistentMockObject = {
  mockPay: () => {
    return nock(POSProxy.baseUrl)
      .persist()
      .post('/pay', (body) => body && body.amount && body.amount >= 1 && body.currency && body.currency === 'RUB')
      .reply(function (_, body) {
        if (typeof body !== 'object' || !this.req.headers['x-api-key']) return [403, 'Wrong X-API-Key'];

        const { amount, currency } = body;

        return [200, {
          amount,
          currency,
          responseCode: '00',
          orderId: faker.random.alphaNumeric(9),
        }];
      });
  },

  mockPayAsStatus: () => {
    return nock(POSProxy.baseUrl)
      .persist()
      .get('/pay')
      .reply(403, 'Wrong X-API-Key');
  },
};

export { oneTime, persistent };
