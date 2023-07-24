/* eslint-disable @typescript-eslint/camelcase, no-console */

import nock from 'nock';
import { subHours } from 'date-fns';

import type { TPersistentMockObject } from './persistent';
import { STAR_TSP650_STATUS } from '../__fixtures__/printer-status';
import { STAR_TSP650_CHECK_PARAMS } from '../__fixtures__/check-params';
import { STAR_TSP650_CORRECTION_PARAMS } from '../__fixtures__/correction-params';
import { PRINTER_ADDRESS } from '../__fixtures__/consts';
import {
  TStatus,
  TCheckParams,
  TCorrectionParams,
  TCheckItem,
  TCashIncomeOutcome,
} from '../typings/printer/StarTSP650';
import StarTSP650Driver from '../printer-drivers/StarTSP650Driver';

const oneTime = {
  mockStatus: (shiftStatus?: 'open' | 'closed', shiftOpenedAt?: string) => {
    const { dt_closed, status } = STAR_TSP650_STATUS.info.shift;
    const replyBody: TStatus = {
      ...STAR_TSP650_STATUS,
      info: {
        ...STAR_TSP650_STATUS.info,
        shift: {
          dt_closed,
          dt_open: shiftOpenedAt || new Date().toISOString(),
          status: shiftStatus || status,
        },
      },
    };
    return nock(`http://${PRINTER_ADDRESS}`)
      .get('/api/v1/status')
      .reply(200, replyBody);
  },

  mockStatusError: () => {
    return nock(`http://${PRINTER_ADDRESS}`)
      .get('/api/v1/status')
      .replyWithError('Connection refused');
  },
  
  mockSetHeader: (headerText: string[]) => {
    return nock(`http://${PRINTER_ADDRESS}`)
      .post('/api/set_header', { text_list: headerText })
      .reply(200, { status: 'ok' });
  },
  
  mockPrintDoc: (params: TCheckParams = STAR_TSP650_CHECK_PARAMS, status: 'ok' | 'error' = 'ok', errorCode = 1) => {
    const { emoney, cash } = params;
    return nock(`http://${PRINTER_ADDRESS}`)
      .post('/api/v2/print_doc', {
        ...params,
        ...(emoney ? { emoney } : { cash }),
      })
      .reply(200, {
        status,
        ...(status === 'error' ? {
          errorCode,
          errorText: 'Some exception',
        } : {}),
      });
  },

  /**
   * It's important to keep order of fields in params exactly same as in STAR_TSP650_CORRECTION_PARAMS
   * because we compare strings (to correct comparsion of taxSums)
   */
  mockCorrection: (params: TCorrectionParams = STAR_TSP650_CORRECTION_PARAMS, withWrongTaxSum = false) => {
    const stringifiedParams = withWrongTaxSum
      ? JSON.stringify(params)
      : StarTSP650Driver.convertTaxSumZerosInData(JSON.stringify(params), params.taxSum[params.taxSum.length - 1]);
    return nock(`http://${PRINTER_ADDRESS}`)
      .post('/api/v2/correction', stringifiedParams)
      .reply(200, { status: 'ok' });
  },

  mockCashOutcome: (amount: number) => {
    return nock(`http://${PRINTER_ADDRESS}`)
    .post('/api/cash_outcome', { summ: amount })
    .reply(200, { status: 'ok' });
  },

  mockCashIncome: (amount: number) => {
    return nock(`http://${PRINTER_ADDRESS}`)
    .post('/api/cash_income', { summ: amount })
    .reply(200, { status: 'ok' });
  },
  
  mockZReport: () => {
    return nock(`http://${PRINTER_ADDRESS}`)
      .post('/api/report_z')
      .reply(200, { status: 'ok' });
  },
};

const printerStatus: TStatus = {
  ...STAR_TSP650_STATUS,
  info: {
    ...STAR_TSP650_STATUS.info,
    shift: {
      dt_closed: subHours(new Date(), 1).toISOString(),
      dt_open: subHours(new Date(), 12).toISOString(),
      status: 'closed',
    },
  },
};

const persistent: TPersistentMockObject = {
  mockStatus: (address) => {
    return nock(`http://${address}`)
      .persist()
      .get('/api/v1/status')
      .reply(200, printerStatus);
  },
  
  mockSetHeader: (address) => {
    return nock(`http://${address}`)
      .persist()
      .post('/api/set_header', (body: { text_list: string[] }) => (
        body &&
        Array.isArray(body.text_list) &&
        body.text_list.every(str => typeof str === 'string')
      ))
      .reply(200, { status: 'ok' });
  },
  
  mockPrintDoc: (address) => {
    return nock(`http://${address}`)
      .persist()
      .post('/api/v2/print_doc', validatePrintDocBody)
      .reply(200, () => {
        // Auto open shift
        if (printerStatus.info.shift.status === 'closed') {
          printerStatus.info.shift.dt_open = new Date().toISOString();
          printerStatus.info.shift.status = 'open';
        }
        return { status: 'ok' };
      });
  },

  mockCorrection: (address) => {
    return nock(`http://${address}`)
      .persist()
      .post('/api/v2/correction', validateCorrectionBody)
      .reply(200, { status: 'ok' });
  },

  mockCashOutcome: (address) => {
    return nock(`http://${address}`)
    .post('/api/cash_outcome', validateAmount)
    .reply(200, { status: 'ok' });
  },

  mockCashIncome: (address) => {
    return nock(`http://${address}`)
    .post('/api/cash_income', validateAmount)
    .reply(200, { status: 'ok' });
  },
  
  mockZReport: (address) => {
    return nock(`http://${address}`)
      .persist()
      .post('/api/report_z')
      .reply(200, () => {
        // Close shift
        if (printerStatus.info.shift.status === 'open') {
          printerStatus.info.shift.dt_closed = new Date().toISOString();
          printerStatus.info.shift.status = 'closed';
          return { status: 'ok' };
        }
        return `
        {
            "errorCode": 1,
            "status": "error",
            "errorText":"Exception was thrown: multisoft.mstar.app.m_cloud.m_cloud.MCloudException
        multisoft.mstar.app.m_cloud.parser.cassby.CassbyParser: :OnPost
        multisoft.mstar.app.m_cloud.parser.BaseParser: :HttpServer_ProcessPostEvent
        multisoft.mstar.app.m_cloud.http.HttpServer: :OnProcessPostEvent
        multisoft.mstar.app.m_cloud.http.HttpServer: :ProcessClientPostRequest
        multisoft.mstar.app.m_cloud.http.HttpServer: :HandleRequestThread
        "}
        `;
      });
  },

  mockXReport: (address) => {
    return nock(`http://${address}`)
      .persist()
      .post('/api/report_x')
      .reply(200, { status: 'ok' });
  },
};

function validatePrintDocBody (body?: TCheckParams) {
  if (!body) return false;

  const { docType, items, emoney, cash, text } = body;
  const docTypes = [1, 2, 3, 4, 5];

  if (typeof docType !== 'number' || !docTypes.includes(docType)) return false;
  if (!Array.isArray(items) || !items.length || !validateCheckItems(items)) return false;
  if (emoney && (typeof emoney !== 'number' || emoney < 0.01)) return false;
  if (cash && (typeof cash !== 'number' || cash < 0.01)) return false;
  if (!emoney && !cash) return false;
  if (text && (!Array.isArray(text) || !text.length)) return false;

  return true;
}

function validateCheckItems (items: TCheckItem[]) {
  const subjectSigns = [1, 2, 3, 4, 5, 6, 7, 8, 9 ,10, 11, 12, 13, 14, 15, 16, 17, 18];

  for (const { name, count, price, taxes, subjectSign } of items) {
    if (typeof name !== 'string' || name.length === 0) return false;
    if (typeof count !== 'number' || count < 1) return false;
    const cents = price.toString().split('.')[1];
    if (typeof price !== 'number' || price < 0.01 || cents?.length > 2) return false;
    if (!Array.isArray(taxes) || !taxes.length || !taxes.includes(1)) return false;
    if (typeof subjectSign !== 'number' || !subjectSigns.includes(subjectSign)) return false;
  }

  return true;
}

function validateCorrectionBody (body?: TCorrectionParams) {
  if (!body) return false;

  const { operationType, correctionType, correctionName, correctionNum, correctionDate, taxSum, emoney, cash } = body;
  const operationTypes = [1, 3];
  const correctionTypes = [0, 1];

  if (typeof operationType !== 'number' || !operationTypes.includes(operationType)) return false;
  if (typeof correctionType !== 'number' || !correctionTypes.includes(correctionType)) return false;
  if (typeof correctionName !== 'string' || correctionName.length < 1) return false;
  if (typeof correctionNum !== 'string' || correctionNum.length < 1) return false;
  if (
    !Array.isArray(correctionDate) ||
    correctionDate.length !== 3 ||
    correctionDate[0] < 1 ||
    (correctionDate[1] < 1 || correctionDate[1] > 12) ||
    (correctionDate[2] < 1 || correctionDate[2] > 31)
  ) return false;
  if (!Array.isArray(taxSum) || (taxSum.length < 1 || taxSum.length > 6) || !taxSum.some(v => v > 0)) return false;
  if (emoney && (typeof emoney !== 'number' || emoney < 0.01)) return false;
  if (cash && (typeof cash !== 'number' || cash < 0.01)) return false;
  if (!emoney && !cash) return false;

  return true;
}

function validateAmount (body?: TCashIncomeOutcome) {
  if (!body) return false;

  const { summ: amount } = body;

  const cents = amount.toString().split('.')[1];
  return Boolean(amount && amount >= 0.01 && (cents ? cents.length <= 2 : true));
}

export {
  oneTime,
  persistent,
};
