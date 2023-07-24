import faker from 'faker';
import nock from 'nock';
import type {
  TSubjectSign,
  TCheckParams,
  TCorrectionParams,
  TTax,
  TPaymentMethod,
  TType,
  TCorrectionOperationType,
  TCorrectionDocumentDate,
  TCheckText,
  TConfig,
} from '@winstrike/pps-typings/printer';
import { WSServer } from '@winstrike/ws-test-helper';

// should be imported before all
import { startPPSAndWaitInitMessage, generateEvotorDevice } from '../helpers';

import type ProxyPaymentService from '../../main';
import { RegisterCheckReq, CorrectionCheckReq, ListResItem, ListReq } from '../../typings/kkm-server';
import { mockRegisterCheck, mockCorrection, mockList } from '../mocks/KKMServer';
import { exponentialRound } from '../../helpers';
import { taxCalculation } from '../../tax';

describe('success cases', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'kkm-server'>;

  beforeEach(async () => {
    server = new WSServer('ws://127.0.0.1:1234');
    await server.listening;
  });

  afterEach(async () => {
    await pps.stop();
    await server.close();
  });

  it('should configure header text of printer', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const headerText = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];

    pps = await startPPSForKKMServer(server, ppsId);

    await server.send({ type: 'configure-printer', body: { headerText } });

    await expect(server).toReceiveMessage({ type: 'configure-printer', status: 'success' });
  });

  const paymentMethods = ['card', 'cash'] as const;
  describe.each(paymentMethods)('KKM actions (%s)', (paymentMethod) => {
    it('should register check', async () => {
      const ppsId = faker.random.alphaNumeric(6);
      const itemName = faker.lorem.word();
      const itemCount = faker.random.number({ min: 1, max: 100 });
      const itemPrice = parseFloat(faker.random.number({ min: 1, max: 9999, precision: 0.01 }).toFixed(2));
      const content = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];
      const amount = exponentialRound(itemPrice * itemCount, 2);
      const cardPaymentInfo = paymentMethod === 'card' && {
        RRNCode: faker.random.alphaNumeric(10),
        authorizationCode: faker.random.alphaNumeric(10),
      };
      const checkParams: TCheckParams = {
        type: faker.random.arrayElement(['income', 'return-of-income']),
        items: [
          {
            name: itemName,
            count: itemCount,
            price: itemPrice,
            tax: '20%',
            subjectSign: 4,
          },
        ],
        paymentMethod,
        content,
      };
      const kkmServerCheckParams: RegisterCheckReq = {
        Command: 'RegisterCheck',
        IdCommand: 'some_id',
        Timeout: 90,
        IsFiscalCheck: true,
        TypeCheck: checkParams.type === 'income' ? 0 : 1,
        NotPrint: false,
        CashierName: 'Иванов А.Б.',
        CheckStrings: [
          {
            Register: {
              Name: itemName,
              Quantity: itemCount,
              Amount: exponentialRound(itemPrice * itemCount, 2),
              Tax: 20,
              SignMethodCalculation: 4,
              SignCalculationObject: 4,
            },
          },
          ...content.map(str => ({ PrintText: { Text: str } })),
        ],
        ...(paymentMethod === 'card' ? { ElectronicPayment: amount } : { Cash: amount }),
      };
  
      pps = await startPPSForKKMServer(server, ppsId);
  
      mockRegisterCheck('some_id', kkmServerCheckParams, cardPaymentInfo || {});
      await server.send({ type: 'register-check', body: checkParams });
  
      await expect(server).toReceiveMessage({
        type: 'register-check',
        status: 'success',
        body: cardPaymentInfo ? {
          invoiceId: `${cardPaymentInfo.RRNCode}:${cardPaymentInfo.authorizationCode}`,
        } : {},
      });
      expect(nock.isDone()).toEqual(true);
    });

    it('should register check for Evotor KKM\'s', async () => {
      const ppsId = faker.random.alphaNumeric(6);
      const itemName = faker.lorem.word();
      const itemCount = faker.random.number({ min: 1, max: 100 });
      const itemPrice = parseFloat(faker.random.number({ min: 1, max: 9999, precision: 0.01 }).toFixed(2));
      const content = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];
      const amount = exponentialRound(itemPrice * itemCount, 2);
      const cardPaymentInfo = paymentMethod === 'card' && {
        RRNCode: faker.random.alphaNumeric(10),
        authorizationCode: faker.random.alphaNumeric(10),
      };
      const evotorDeviceInfo = generateEvotorDevice();
      const checkParams: TCheckParams = {
        type: faker.random.arrayElement(['income', 'return-of-income']),
        items: [
          {
            name: itemName,
            count: itemCount,
            price: itemPrice,
            tax: '20%',
            subjectSign: 4,
          },
        ],
        paymentMethod,
        content,
      };
      const kkmServerCheckParams: RegisterCheckReq = {
        Command: 'RegisterCheck',
        IdCommand: 'some_id',
        Timeout: 90,
        IsFiscalCheck: true,
        TypeCheck: checkParams.type === 'income' ? 0 : 1,
        NotPrint: false,
        CashierName: 'Иванов А.Б.',
        TaxVariant: evotorDeviceInfo.TaxVariant,
        CheckStrings: [
          {
            Register: {
              Name: itemName,
              Quantity: itemCount,
              Amount: exponentialRound(itemPrice * itemCount, 2),
              Tax: 20,
              SignMethodCalculation: 4,
              SignCalculationObject: 4,
            },
          },
        ],
        ...(paymentMethod === 'card' ? { ElectronicPayment: amount } : { Cash: amount }),
      };
      const contentCheckParams: RegisterCheckReq = {
        Command: 'RegisterCheck',
        IdCommand: 'some_id',
        IsFiscalCheck: false,
        TypeCheck: 0,
        NotPrint: false,
        CashierName: 'Иванов А.Б.',
        CheckStrings: [
          { PrintText: { Text: ' ' } },
          { PrintText: { Text: ' ' } },
          ...content.map(str => ({ PrintText: { Text: str.toUpperCase() } })),
          { PrintText: { Text: ' ' } },
          { PrintText: { Text: ' ' } },
        ],
      };
  
      pps = await startPPSForKKMServer(server, ppsId, [evotorDeviceInfo]);
  
      mockRegisterCheck('some_id', kkmServerCheckParams, cardPaymentInfo || {});
      mockRegisterCheck('some_id', contentCheckParams);
      await server.send({ type: 'register-check', body: checkParams });
  
      await expect(server).toReceiveMessage({
        type: 'register-check',
        status: 'success',
        body: cardPaymentInfo ? {
          invoiceId: `${cardPaymentInfo.RRNCode}:${cardPaymentInfo.authorizationCode}`,
        } : {},
      });
      expect(nock.isDone()).toEqual(true);
    });
  
    it('should print correction', async () => {
      const ppsId = faker.random.alphaNumeric(6);
      const amount = parseFloat(faker.random.number({ min: 1, max: 9999, precision: 0.01 }).toFixed(2));
      const documentName = faker.lorem.words();
      const documentDate: [number, number, number] = [21, 1, 10];
      const documentNumber = faker.random.number({ min: 1, max: 1000 }).toString();
      const correctionParams: TCorrectionParams = {
        operationType: faker.random.arrayElement(['income', 'outcome']),
        isPrescribed: faker.random.boolean(),
        amount,
        paymentMethod,
        tax: '20%',
        documentName,
        documentDate,
        documentNumber,
      };
      const kkmServerCorrectionParams: CorrectionCheckReq = {
        Command: 'RegisterCheck',
        IdCommand: 'some_id',
        IsFiscalCheck: true,
        TypeCheck: correctionParams.operationType === 'income' ? 2 : 12,
        CorrectionType: correctionParams.isPrescribed ? 1 : 0,
        NotPrint: false,
        CashierName: 'Иванов А.Б.',
        CorrectionBaseName: documentName,
        CorrectionBaseNumber: documentNumber,
        CorrectionBaseDate: new Date('2021.01.10').toISOString(),
        Amount: amount,
        SumTax20: exponentialRound(taxCalculation['20%'](amount), 2),
        ...(paymentMethod === 'card' ? { Cash: amount } : { ElectronicPayment: amount }),
      };
      
      pps = await startPPSForKKMServer(server, ppsId);
  
      mockCorrection(kkmServerCorrectionParams);
      await server.send({ type: 'print-correction', body: correctionParams });
  
      await expect(server).toReceiveMessage({ type: 'print-correction', status: 'success' });
      expect(nock.isDone()).toEqual(true);
    });
  });
});

describe('error cases', () => {
  let server: WSServer;
  let pps: ProxyPaymentService<'classic'>;

  beforeEach(async () => {
    server = new WSServer('ws://127.0.0.1:1234');
    await server.listening;
  });

  afterEach(async () => {
    nock.cleanAll();
    await pps.stop();
    await server.close();
  });

  it('should return validation errors for configure', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const configParams: TConfig = {
      headerText: [1, 2, 3] as unknown as TCheckText,
      cashierName: 'John Doe',
    };
    const expectedMessage = 'headerText must be array of strings';

    pps = await startPPSForKKMServer(server, ppsId);

    await server.send({ type: 'configure-printer', body: configParams });

    await expect(server).toReceiveMessage({
      type: 'configure-printer',
      status: 'error',
      body: { message: expectedMessage },
    });
  });

  it('should return validation errors for register check', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const checkParams: TCheckParams = {
      type: 'unknown-type' as TType,
      items: [
        {
          name: '',
          count: 0,
          price: -1,
          tax: '200%' as TTax,
          subjectSign: 48 as TSubjectSign,
        },
      ],
      paymentMethod: '' as TPaymentMethod,
      content: [1, 3, 4] as unknown as TCheckText,
    };
    const kkmServerCheckParams: RegisterCheckReq = {
      Command: 'RegisterCheck',
      IdCommand: '123',
      IsFiscalCheck: true,
      TypeCheck: checkParams.type === 'income' ? 0 : 1,
      NotPrint: false,
      CashierName: 'Иванов А.Б.',
      CheckStrings: [
        {
          Register: {
            Name: '',
            Quantity: 0,
            Amount: 0,
            Tax: 20,
            SignMethodCalculation: 4,
            SignCalculationObject: 4,
          },
        },
      ],
    };
    const expectedMessage = [
      'Item #1 name must be not empty string',
      'Item #1 count must be number more than zero',
      'Item #1 price must be positive number and contains 2 digit cents',
      'Item #1 tax must be string with one of valid values: 20%, 10%, 20/120, 10/110, 0%, Без НДС',
      'Item #1 subjectSign must be number with one of valid values: ' +
        '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18',
      'type must be string with one of valid values: income, return-of-income',
      'paymentMethod must be string with one of valid values: cash, card',
      'content must be array of strings',
    ];

    pps = await startPPSForKKMServer(server, ppsId);

    mockRegisterCheck('123', kkmServerCheckParams);
    await server.send({ type: 'register-check', body: checkParams });

    await expect(server).toReceiveMessage({
      type: 'register-check',
      status: 'error',
      body: { message: expectedMessage },
    });
  });

  it('should return validation errors for correction', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const correctionParams: TCorrectionParams = {
      operationType: '' as TCorrectionOperationType,
      isPrescribed: 1 as unknown as boolean,
      amount: -1,
      paymentMethod: '' as TPaymentMethod,
      tax: '' as TTax,
      documentName: '',
      documentDate: '12.13.2006' as unknown as TCorrectionDocumentDate,
      documentNumber: '',
    };
    const kkmServerCorrectionParams: CorrectionCheckReq = {
      Command: 'RegisterCheck',
      IdCommand: '',
      IsFiscalCheck: true,
      TypeCheck: correctionParams.operationType === 'income' ? 2 : 12,
      CorrectionType: correctionParams.isPrescribed ? 1 : 0,
      NotPrint: false,
      CashierName: 'Иванов А.Б.',
      CorrectionBaseName: '',
      CorrectionBaseNumber: '',
      CorrectionBaseDate: '',
      Amount: 0,
      SumTax20: exponentialRound(taxCalculation['20%'](0), 2),
    };
    const expectedMessage = [
      'operationType must be string with one of valid values: income, outcome',
      'isPrescribed must be boolean',
      'amount must be number more than 0 and contains 2 digit cents',
      'paymentMethod must be string with one of valid values: cash, card',
      'tax must be string with one of valid values: 20%, 10%, 20/120, 10/110, 0%, Без НДС',
      'documentName must be not empty string',
      'documentNumber must be not empty string',
      'documentDate must be array with three number values: year (more than 0), ' +
        'month (more than 0 and less than 13), ' +
        'month day (more than 0 and less than 32)',
    ];

    pps = await startPPSForKKMServer(server, ppsId);

    mockCorrection(kkmServerCorrectionParams);
    await server.send({ type: 'print-correction', body: correctionParams });

    await expect(server).toReceiveMessage({
      type: 'print-correction',
      status: 'error',
      body: { message: expectedMessage },
    });
    expect(nock.isDone()).toEqual(false);
  });
});

function startPPSForKKMServer (server: WSServer, ppsId: string, devices: ListResItem[] = []) {
  const listBody: ListReq = {
    IdCommand: 'some_id',
    Command: 'List',
    Active: true,
    OnOff: true,
  };

  mockList(listBody, devices);

  return startPPSAndWaitInitMessage('kkm-server', server, { ppsId });
}
