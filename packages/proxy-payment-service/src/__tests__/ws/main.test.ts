import faker from 'faker';
import { subDays } from 'date-fns';
import { WSServer } from '@winstrike/ws-test-helper';
import { TServerMessageType } from '@winstrike/pps-typings/ws-client';

// should be imported before all
import { startPPSAndWaitInitMessage, mockOperationsDB } from '../helpers';

import type ProxyPaymentService from '../../main';
import { IWSClient } from '../../WSClient';
import WSClientFactory from '../../WSClientFactory';
import TerminalDriverMock from '../helpers/TerminalDriverMock';
import PrinterDriverMock from '../helpers/PrinterDriverMock';
import { OperationsDBSchema, Status, Operation } from '../../db/OperationsDB';
import DBMock from '../helpers/DBMock';
import { ITerminalDriver } from '../../TerminalDriver';
import HumanizedError from '../../HumanizedError';
import { StarTSP650 } from '../../request-mocks/one-time';

afterAll(async () => {
  await WSServer.clean();
});

describe('main', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'classic'>;
  let ppsId: string;

  beforeEach(async () => {
    const url = 'ws://127.0.0.1:1234';
    server = new WSServer(url);
    ppsId = faker.random.alphaNumeric(6);
    await server.listening;
  });

  afterEach(async () => {
    if (pps) await pps.stop();
    await server.close();
  });

  it('should start and connect to WS server', async () => {
    StarTSP650.mockStatus();
    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    expect(server).toHaveReceivedMessages([{ type: 'init', body: { ppsId } }]);
  });

  describe('operations storage', () => {
    let client: IWSClient;
    let db: DBMock<OperationsDBSchema>;
    let terminalDriver: ITerminalDriver;

    beforeEach(async () => {
      const printerDriver = new PrinterDriverMock();
      await printerDriver.configure({ cashierName: 'Иванов А.Б.' });
      db = mockOperationsDB();
      terminalDriver = new TerminalDriverMock();
      client = new WSClientFactory().createWSClient(
        'classic',
        {
          terminalDriver,
          printerDriver,
        },
        {
          psUrl: 'ws://127.0.0.1:1234',
          ppsId,
        },
      );
      await client.start();
      await server.connected;
      await server.waitNextMessage();
    });

    afterEach(async () => {
      await client.stop();
    });

    it('should exec operation and save it to storage with status \'success\'', async () => {
      const amount = faker.random.number({ min: 1, max: 999999 });
      const invoiceId = faker.random.number({ min: 1, max: 999999 }).toString();
      const operationId = faker.random.alphaNumeric(10);
      const pay = jest.fn(() => Promise.resolve(invoiceId));

      terminalDriver.pay = pay;

      await server.send({ type: 'pay', operationId, body: { amount, currency: 'RUB' } });

      await expect(server).toReceiveMessage({
        type: 'pay',
        status: 'success',
        body: { invoiceId },
      });
      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations[0]).toHaveProperty('createdAt');
      expect(db.db.operations).toEqual(expect.arrayContaining([{
        id: operationId,
        type: 'pay',
        status: 'success',
        body: { invoiceId },
        createdAt: db.db.operations[0].createdAt,
      }]));
      // Operation executed
      expect(pay).toHaveBeenCalledTimes(1);
    });

    it('should exec operation and save it to storage with status \'error\'', async () => {
      const amount = faker.random.number({ min: 1, max: 999999 });
      const operationId = faker.random.alphaNumeric(10);
      const error = new HumanizedError(
        '[Терминал] Неизвестная ошибка',
        'Terminal returned error \'-1\'',
      );
      const pay = jest.fn(() => Promise.reject(error));
      const body = { message: error.message, humanizedMessage: error.humanizedMessage };

      terminalDriver.pay = pay;

      await server.send({ type: 'pay', operationId, body: { amount, currency: 'RUB' } });

      await expect(server).toReceiveMessage({
        type: 'pay',
        status: 'error',
        body,
      });
      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations[0]).toHaveProperty('createdAt');
      expect(db.db.operations).toEqual(expect.arrayContaining([{
        id: operationId,
        type: 'pay',
        status: 'error',
        body,
        createdAt: db.db.operations[0].createdAt,
      }]));
      // Operation executed
      expect(pay).toHaveBeenCalledTimes(1);
    });

    it('should not exec operation which stored in DB and has status \'success\'', async () => {
      const amount = faker.random.number({ min: 1, max: 999999 });
      const invoiceId = faker.random.number({ min: 1, max: 999999 }).toString();
      const operationId = faker.random.alphaNumeric(10);
      const pay = jest.fn(() => Promise.resolve(invoiceId));
      const operation = {
        id: operationId,
        type: 'pay' as TServerMessageType,
        status: 'success' as Status,
        body: { invoiceId },
        createdAt: new Date().getTime(),
      };

      terminalDriver.pay = pay;
      db.db.operations.push(operation);

      await server.send({ type: 'pay', operationId, body: { amount, currency: 'RUB' } });

      await expect(server).toReceiveMessage({
        type: 'pay',
        status: 'success',
        body: { invoiceId },
      });
      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations).toEqual(expect.arrayContaining([operation]));
      // Operation not executed
      expect(pay).toHaveBeenCalledTimes(0);
    });

    it('should not exec operation which stored in DB and has status \'error\'', async () => {
      const amount = faker.random.number({ min: 1, max: 999999 });
      const operationId = faker.random.alphaNumeric(10);
      const error = new HumanizedError(
        '[Терминал] Неизвестная ошибка',
        'Terminal returned error \'-1\'',
      );
      const pay = jest.fn(() => Promise.reject(error));
      const body = { message: error.message, humanizedMessage: error.humanizedMessage };
      const operation = {
        id: operationId,
        type: 'pay' as TServerMessageType,
        status: 'error' as Status,
        createdAt: new Date().getTime(),
        body,
      };

      terminalDriver.pay = pay;
      db.db.operations.push(operation);

      await server.send({ type: 'pay', operationId, body: { amount, currency: 'RUB' } });

      await expect(server).toReceiveMessage({
        type: 'pay',
        status: 'error',
        body,
      });
      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations).toEqual(expect.arrayContaining([operation]));
      // Operation not executed
      expect(pay).toHaveBeenCalledTimes(0);
    });

    it('should throw error for operation which stored in DB and has status \'pending\'', async () => {
      const amount = faker.random.number({ min: 1, max: 999999 });
      const invoiceId = faker.random.number({ min: 1, max: 999999 }).toString();
      const operationId = faker.random.alphaNumeric(10);
      const pay = jest.fn(() => Promise.resolve(invoiceId));
      const operation = {
        id: operationId,
        type: 'pay' as TServerMessageType,
        status: 'pending' as Status,
        createdAt: new Date().getTime(),
      };

      terminalDriver.pay = pay;
      db.db.operations.push(operation);

      await server.send({ type: 'pay', operationId, body: { amount, currency: 'RUB' } });

      await expect(server).toReceiveMessage({
        type: 'pay',
        status: 'error',
        body: {
          message: 'Operation may have been done',
          humanizedMessage: 'Операция с устройством возможно была выполнена',
        },
      });
      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations).toEqual(expect.arrayContaining([operation]));
      // Operation not executed
      expect(pay).toHaveBeenCalledTimes(0);
    });

    it('should remove old operations on start WS client', async () => {
      const invoiceId = faker.random.number({ min: 1, max: 999999 }).toString();
      const operations: Operation[] = [
        {
          id: faker.random.alphaNumeric(10),
          type: 'pay',
          status: 'success',
          createdAt: subDays(new Date(), 8).getTime(),
          body: { invoiceId },
        },
        {
          id: faker.random.alphaNumeric(10),
          type: 'print-check',
          status: 'success',
          createdAt: new Date().getTime(),
        },
      ];

      db.db.operations.push(...operations);

      await client.stop();
      await client.start();

      expect(db.db.operations).toHaveLength(1);
      expect(db.db.operations).toEqual(expect.arrayContaining([operations[1]]));
    });
  });
});
