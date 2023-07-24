/* eslint-disable @typescript-eslint/camelcase */

import faker from 'faker';
import { WSServer } from '@winstrike/ws-test-helper';

import type { Options, TerminalModel, PrinterModel, Acquiring } from '../../main';
import ProxyPaymentService from '../../main';
import POSProxy from '../../POSProxy';
import { TERMINAL_ADDRESS, PRINTER_ADDRESS } from '../../__fixtures__/consts';
import {
  TCorrectionParams as TStar650CorrectionParams,
  TCheckParams as TStar650CheckParams,
  TTaxSums,
} from '../../typings/printer/StarTSP650';
import { TCorrectionParams, TTax, TCheckParams } from '@winstrike/pps-typings/printer';
import { exponentialRound } from '../../helpers';
import { taxes, taxCalculation } from '../../tax';
import SbPilot from '../../SbPilot';
import { OperationStatus } from '../../SbPilotOperationStatusChecker';
import WSClientFactory from '../../WSClientFactory';
import DBMock from './DBMock';
import { OperationsDBSchema } from '../../db/OperationsDB';
import { Mode } from '../../typings/main';
import { ListResItem } from '../../typings/kkm-server';

// Mock nanoid to use deterministic ids
jest.mock('nanoid', () => ({ nanoid: () => 'some_id', customAlphabet: () => () => 'some_id' }));

const PPS_ID = faker.random.alphaNumeric(6);

const PPS_OPTIONS = {
  psUrl: 'ws://localhost:1234',
  ppsId: PPS_ID,
  terminal: {
    model: 'PAXSP30' as TerminalModel,
    address: TERMINAL_ADDRESS,
    acquiring: 'cassby' as Acquiring,
  },
  printer: {
    model: 'StarTSP650' as PrinterModel,
    address: PRINTER_ADDRESS,
    shouldAutoCloseShift: false,
    shouldHealthcheck: false,
    shouldResetConfig: false,
    withMoySkladIntegration: false,
  },
};

// Mock 'init' method to prevent terminal ping and launch POSProxy java app
POSProxy.prototype.init = jest.fn(function (this: POSProxy) {
  this.isInited = true;
  return Promise.resolve();
});

// Mock SbPilot methods to prevent terminal ping, launch sb_pilot app and send commands to it
SbPilot.prototype.init = jest.fn(function (this: SbPilot) {
  this.isInited = true;
  return Promise.resolve();
});
function mockSbPilotSendCommand (customOperationStatus?: Partial<OperationStatus & { code: string; message: string }>) {
  SbPilot.sendCommandTest = jest.fn(() => {
    const code = '0';
    const message = 'Операция успешна';
  
    const operationStatus = {
      codeAndMessage: `${code},${message}`,
      cardNumberMasked: '',
      expirationDate: '',
      authorizationCode: '',
      numberInner: '',
      cardType: '',
      sberbankSign: '',
      terminalNumber: '',
      dateTime: '',
      referenceNumber: '',
      cardNumberHash: '',
      track3: '',
      spasiboAmount: '',
      merchantNumber: '',
      monitoringMessageType: '',
      gpcState: '',
      monitoringMessage: '',
      loyalityProgramNumber: '',
      userResponseFor49: '',
      id: '',
      mask: '',
      mifareLoyalityNumber: '',
      vasEnabled: '',
      ...customOperationStatus || {},
    };
  
    return Promise.resolve({ code, message, ...operationStatus });
  });
}

// Mock operations DB to prevent writing to file
WSClientFactory.createOperationsDb = jest.fn(() => new DBMock<OperationsDBSchema>({ operations: [] }));
function mockOperationsDB () {
  const db = new DBMock<OperationsDBSchema>({ operations: [] });

  WSClientFactory.createOperationsDb = jest.fn(() => db);

  return db;
}

async function startPPSAndWaitInitMessage (
  mode: Mode,
  server: WSServer,
  options?: Partial<Options<'classic' | 'kkm-server'>>,
) {
  const ppsPromise = startPPS(mode, options);
  await server.connected;
  await server.waitNextMessage();
  return ppsPromise;
}

async function startPPS (
  mode: Mode,
  options?: Partial<Options<'classic' | 'kkm-server'>>,
) {
  const pps = new ProxyPaymentService(mode, { ...PPS_OPTIONS, ...options });

  await pps.start();
  await pps.cashierActions.configure({ cashierName: 'Иванов А.Б.' });
  return pps;
}

function convertCheckParams ({ docType, items, cash, emoney, text }: TStar650CheckParams): TCheckParams {
  const paymentMethod = (cash !== undefined && 'cash') || (emoney !== undefined && 'card');

  if (!paymentMethod) throw new Error('Cash or emoney total must specified');

  return {
    type: docType === 2 ? 'income' : 'return-of-income' as const,
    items: items.map(({ name, count, price, subjectSign, taxes: txs }) => ({
      name,
      count,
      price,
      subjectSign,
      tax: taxes[txs.indexOf(1)],
    })),
    paymentMethod,
    content: text,
  };
}

function convertCorrectionParams ({
  operationType, correctionType, cash, emoney, taxSum, correctionName, correctionDate, correctionNum,
}: TStar650CorrectionParams): TCorrectionParams {
  return {
    operationType: operationType === 1 ? 'income' : 'outcome',
    isPrescribed: correctionType === 1,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    amount: emoney || cash!,
    paymentMethod: emoney ? 'card' : 'cash',
    tax: taxSum.reduce<TTax>((acc, sum, i) => sum > 0 ? acc = taxes[i] : acc, '20%'),
    documentName: correctionName,
    documentDate: correctionDate,
    documentNumber: correctionNum,
  };
}

function generateTaxSums (amount: number) {
  const tax = faker.random.arrayElement(taxes);
  const taxIndex = taxes.findIndex(t => t === tax);
  const taxSums = new Array<number>(taxIndex).fill(0.00);
  taxSums.push(exponentialRound(taxCalculation[tax](amount), 2));
  return taxSums as TTaxSums;
}

function delay (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateEvotorDevice (): ListResItem {
  return {
    NumDevice: 0,
    IdDevice: faker.random.uuid(),
    OnOff: true,
    Active: true,
    TypeDevice: 'Фискальный регистратор',
    IdTypeDevice: 'Evotor',
    Firmware_Version: '<Не определено>',
    IP: '',
    Port: '',
    NameDevice: `Эвотор: ${faker.random.alphaNumeric(10)}`,
    UnitName: '',
    KktNumber: faker.random.number({ min: 11111111111, max: 99999999999 }).toString(),
    INN: faker.random.number({ min: 1111111111, max: 9999999999 }).toString(),
    RegNumber: '',
    FnNumber: '',
    InnOfd: '',
    NameOrganization: faker.company.companyName(),
    AddressSettle: '',
    TaxVariant: faker.random.arrayElement([0,1,2,3,4,5]).toString(),
    AddDate: faker.date.past().toISOString(),
    BSOMode: false,
    ServiceMode: false,
    OFD_Error: '',
    OFD_NumErrorDoc: 0,
    OFD_DateErrorDoc: faker.date.past().toISOString(),
    FN_DateEnd: faker.date.past().toISOString(),
    FN_MemOverflowl: false,
    FN_IsFiscal: true,
    PaperOver: false,
    FFDVersion: '1.05',
    FFDVersionFN: '1.0',
    FFDVersionKKT: '1.1',
    IsRegisterCheck: true,
  };
}

export {
  PPS_OPTIONS,
  PRINTER_ADDRESS,
  mockSbPilotSendCommand,
  mockOperationsDB,
  startPPS,
  startPPSAndWaitInitMessage,
  convertCheckParams,
  convertCorrectionParams,
  generateTaxSums,
  delay,
  generateEvotorDevice,
};
