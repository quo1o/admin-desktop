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
import { startPPSAndWaitInitMessage, convertCorrectionParams, generateTaxSums, convertCheckParams } from '../helpers';

import type ProxyPaymentService from '../../main';
import type {
  TCheckParams as TStarTSP650CheckParams,
  TCorrectionParams as TStar650CorrectionParams,
  TCorrectionOperationType as TStar650CorrectionOperationType,
  TCorrectionType as TStarTSP650CorrectionType,
  TTaxSums as TStarTSP650TaxSums,
} from '../../typings/printer/StarTSP650';
import { StarTSP650 } from '../../request-mocks/one-time';
import { ERROR_MESSAGE } from '../../printer-drivers/StarTSP650Driver';

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

  it('should configure header text of printer', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const headerText = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockSetHeader(headerText);
    await server.send({ type: 'configure-printer', body: { headerText } });

    await expect(server).toReceiveMessage({ type: 'configure-printer', status: 'success' });
    expect(nock.isDone()).toEqual(true);
  });

  it('should print check', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const itemName = faker.lorem.word();
    const content = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];
    const checkParams: TCheckParams = {
      type: 'income',
      items: [
        {
          name: itemName,
          count: 2,
          price: 100,
          tax: '20%',
          subjectSign: 4,
        },
      ],
      paymentMethod: 'cash',
      content,
    };
    const starTSP650CheckParams: TStarTSP650CheckParams = {
      docType: 2,
      items: [
        {
          name: itemName,
          count: 2,
          price: 100,
          subjectSign: 4,
          taxes: [1, 0, 0, 0, 0, 0],
        },
      ],
      cash: 200,
      text: content,
      userName: 'Иванов А.Б.',
    };

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockPrintDoc(starTSP650CheckParams);
    await server.send({ type: 'print-check', body: checkParams });

    await expect(server).toReceiveMessage({ type: 'print-check', status: 'success' });
    expect(nock.isDone()).toEqual(true);
  });

  it('should print correction', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const amount = parseFloat(faker.random.number({ min: 1, max: 9999, precision: 0.01 }).toFixed(2));
    const starTSP650CorrectionParams: TStar650CorrectionParams = {
      operationType: faker.random.arrayElement([1, 3]),
      correctionType: faker.random.arrayElement([0, 1]),
      correctionName: faker.lorem.words(3),
      correctionNum: faker.random.alphaNumeric(),
      correctionDate: [
        faker.random.number({ min: 1, max: 20 }),
        faker.random.number({ min: 1, max: 12 }),
        faker.random.number({ min: 1, max: 28 }),
      ],
      taxSum: generateTaxSums(amount),
      ...faker.random.arrayElement([ { cash: amount }, { emoney: amount }]),
    };
    const correctionParams = convertCorrectionParams(starTSP650CorrectionParams);
    
    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockCorrection(starTSP650CorrectionParams);
    await server.send({ type: 'print-correction', body: correctionParams });

    await expect(server).toReceiveMessage({ type: 'print-correction', status: 'success' });
    expect(nock.isDone()).toEqual(true);
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

  it('should return validation errors for configure', async () => {
    const ppsId = faker.random.alphaNumeric(6);
    const configParams: TConfig = {
      headerText: [1, 2, 3] as unknown as TCheckText,
    };
    const expectedMessage = 'headerText must be array of strings';

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockSetHeader(configParams.headerText!);
    await server.send({ type: 'configure-printer', body: configParams });

    await expect(server).toReceiveMessage({
      type: 'configure-printer',
      status: 'error',
      body: { message: expectedMessage },
    });
    expect(nock.isDone()).toEqual(false);
  });

  it('should return validation errors for print check', async () => {
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
    const starTSP650CheckParams: TStarTSP650CheckParams = {
      docType: 2,
      items: [
        {
          name: '',
          count: 0,
          price: -1,
          taxes: [0, 0, 0, 0, 0, 0],
          subjectSign: 48 as TSubjectSign,
        },
      ],
      emoney: 1000,
      cash: 1000,
      text: [1, 3, 4] as unknown as TCheckText,
      userName: 'Иванов А.Б.',
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

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockPrintDoc(starTSP650CheckParams);
    await server.send({ type: 'print-check', body: checkParams });

    await expect(server).toReceiveMessage({
      type: 'print-check',
      status: 'error',
      body: { message: expectedMessage },
    });
    expect(nock.isDone()).toEqual(false);
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
    const starTSP650CorrectionParams: TStar650CorrectionParams = {
      operationType: '' as unknown as TStar650CorrectionOperationType,
      correctionType: '' as unknown as TStarTSP650CorrectionType,
      correctionName: '',
      correctionNum: '',
      correctionDate: '12.13.2006' as unknown as TCorrectionDocumentDate,
      taxSum: '' as unknown as TStarTSP650TaxSums,
      emoney: 1000,
      cash: 1000,
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

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId });

    StarTSP650.mockCorrection(starTSP650CorrectionParams, true);
    await server.send({ type: 'print-correction', body: correctionParams });

    await expect(server).toReceiveMessage({
      type: 'print-correction',
      status: 'error',
      body: { message: expectedMessage },
    });
    expect(nock.isDone()).toEqual(false);
  });

  const humanizedErrorCases = [ ...Object.entries(ERROR_MESSAGE), ['unknown', undefined]];
  it.each(humanizedErrorCases)('should return humanized error for code \'%s\'', async (codeString, message) => {
    const code = codeString === 'unknown' ? 99 : parseInt(codeString!, 10);
    const itemName = faker.lorem.word();
    const content = [faker.lorem.sentence(2), faker.lorem.sentence(2), faker.lorem.sentence(2)];
    const starTSP650CheckParams: TStarTSP650CheckParams = {
      docType: 2,
      items: [
        {
          name: itemName,
          count: 2,
          price: 100,
          subjectSign: 4,
          taxes: [1, 0, 0, 0, 0, 0],
        },
      ],
      cash: 200,
      text: content,
      userName: 'Иванов А.Б.',
    };
    const checkParams = convertCheckParams(starTSP650CheckParams);

    pps = await startPPSAndWaitInitMessage('classic', server, { ppsId: faker.random.alphaNumeric(6) });

    StarTSP650.mockPrintDoc(starTSP650CheckParams, 'error', code);
    await server.send({ type: 'print-check', body: checkParams });

    await expect(server).toReceiveMessage({
      type: 'print-check',
      status: 'error',
      body: {
        message: `Code ${code}; Text: Some exception`,
        humanizedMessage: `[Принтер] ${message || 'Неизвестная ошибка'}`,
      },
    });
    expect(nock.isDone()).toEqual(true);
  });
});
