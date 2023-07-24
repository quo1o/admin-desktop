import axios from 'axios';
import type {
  TConfig,
  TCheckParams as TBaseCheckParams,
  TCheckItem as TBaseCheckItem,
  TPaymentMethod,
  TTax,
  TType,
  TCorrectionParams as TBaseCorrectionParams,
} from '@winstrike/pps-typings/printer';

import type {
  TStatus,
  TCheckParams,
  TTaxes,
  TCorrectionParams,
  TTaxSums,
  TError,
} from '../typings/printer/StarTSP650';
import type { TProps, TStatus as TBaseStatus } from '../PrinterDriver';
import { calculateTotal, exponentialRound } from '../helpers';
import PrinterDriver from '../PrinterDriver';
import healthcheck from '../helpers/healthcheck';
import HumanizedError from '../HumanizedError';
import { validateConfigure, validateCheckParams, validateCorrectionParams, validateAmount } from '../validator';
import { taxes, taxCalculation } from '../tax';
import { log } from '../logger';

const ERROR_MESSAGE = {
  1:  'Операция не выполнима при данном статусе',
  3:  'Некорректный формат или параметр команды',
  8:  'Конец рулона бумаги',
  9:  'Принтер не готов (возможно проблемы с бумагой)',
  10: 'Смена открыта более 24-х часов',
  11: 'Разница во времени внутренних часов и указанного в команде начала работы больше 8-ми минут',
  12: 'Вводимая дата более ранняя, чем дата последней фискальной операции',
  14: 'Недостаточно средств в денежном ящике',
  15: 'Для выполнения команды необходимо закрыть смену',
} as const;

class StarTSP650Driver extends PrinterDriver {
  constructor (props: TProps) {
    super(props);

    this.baseUrl = `http://${this.address}/api`;
  }

  private baseUrl: string;

  async healthcheck () {
    const { data: status } = await healthcheck<TStatus>({
      url: `${this.baseUrl}/v1/status`,
      errorMessage: 'Принтер не обнаружен',
      checkResult: (result) => result.status === 200,
    });

    this.status = StarTSP650Driver.transformStatus(status);
  }

  private static transformStatus (status: TStatus): TBaseStatus {
    const { dt_open: shiftOpenedAtString, status: shiftStatus } = status.info.shift;

    return {
      shiftOpenedAt: new Date(shiftOpenedAtString.replace(/\.\d+Z|T/g, ' ').trim()),
      shiftStatus: shiftStatus === 'open' ? 'opened' : 'closed',
    };
  }

  async refreshStatus () {
    const status = await this.request<TStatus>('get', '/v1/status');
    this.status = StarTSP650Driver.transformStatus(status);
    return this.status;
  }

  async configure (config: TConfig) {
    await validateConfigure(config);

    const { headerText, cashierName } = config;

    if (cashierName) this.cashierName = cashierName;

    // Putting array with one empty string because printer doesn't reset header text if array doesn't contain items
    // eslint-disable-next-line @typescript-eslint/camelcase
    if (headerText) await this.request('post', '/set_header', { text_list: headerText.length ? headerText : [''] });
  }

  async printCheck (params: TBaseCheckParams) {
    await validateCheckParams(params);

    const { type, items, paymentMethod, content } = params;

    if (!this.cashierName) throw new HumanizedError('[Принтер] Не указано имя кассира', 'No cashier name specified');

    const checkParams: TCheckParams = {
      docType: StarTSP650Driver.getDocType(type),
      items: StarTSP650Driver.transformItems(items),
      ...StarTSP650Driver.getTotal(items, paymentMethod),
      text: content,
      userName: this.cashierName,
    };

    await this.request('post', '/v2/print_doc', checkParams);

    if (this.status?.shiftStatus === 'closed') {
      await this.refreshStatus();
    }
  }

  private static getDocType (type: TType) {
    return type === 'return-of-income' ? 3 : 2;
  }

  private static transformItems (items: TBaseCheckItem[]) {
    return items.map((item) => {
      const itemCopy = { ...item };
      delete itemCopy.tax;
      return {
        ...itemCopy,
        taxes: this.convertTaxToTaxesArray(item.tax),
      };
    });
  }

  private static convertTaxToTaxesArray (tax: TTax): TTaxes {
    const get = (i: number) => taxes[i] === tax ? 1 : 0;
    return [get(0), get(1), get(2), get(3), get(4), get(5)];
  }

  private static getTotal (items: TBaseCheckItem[], paymentMethod: TPaymentMethod) {
    const total = calculateTotal(items);
    return paymentMethod === 'card' ? { emoney: total } : { cash: total };
  }

  async printCorrection (params: TBaseCorrectionParams) {
    await validateCorrectionParams(params);

    const {
      operationType, isPrescribed, amount, paymentMethod, tax, documentName, documentDate, documentNumber,
    } = params;

    const correctionParams: TCorrectionParams = {
      operationType: operationType === 'income' ? 1 : 3,
      correctionType: isPrescribed ? 1 : 0,
      correctionName: documentName,
      correctionNum: documentNumber,
      correctionDate: documentDate,
      taxSum: StarTSP650Driver.getTaxSums(tax, amount),
      ...(paymentMethod === 'card' ? { emoney: amount } : { cash: amount }),
    };

    await this.request('post', '/v2/correction', correctionParams);
  }

  private static getTaxSums (tax: TTax, amount: number) {
    return taxes.reduce<TTaxSums>((acc, t, i) => {
      if (t === tax) {
        acc[i] = exponentialRound(taxCalculation[t](amount), 2);
      } else if (acc[acc.length - 1] === 0) {
        acc[i] = 0.00;
      }
      return acc;
    }, [0.00]);
  }

  async withdrawCash (amount: number) {
    const validationError = validateAmount(amount);
    if (validationError) return Promise.reject(validationError);

    await this.request('post', '/cash_outcome', { summ: amount });
  }

  async depositCash (amount: number) {
    const validationError = validateAmount(amount);
    if (validationError) return Promise.reject(validationError);

    await this.request('post', '/cash_income', { summ: amount });
  }

  async openShift () {
    await this.request('post', '/open_shift');
  }

  async closeShift () {
    await this.printZReport();
  }

  async printXReport () {
    await this.request('post', '/report_x');
  }

  async printZReport () {
    await this.request('post', '/report_z');
    await this.refreshStatus();
  }

  private async request <T = unknown> (method: 'get' | 'post', path: string, data?: { [key: string]: unknown }) {
    if (!this.isInited) throw new Error('Принтер не инициализирован');

    const url = `${this.baseUrl}${path}`;

    let { data: resultData } = method === 'get'
      ? (await axios.get<T>(url))
      : (await axios.post<T>(url, data, {
        transformRequest: StarTSP650Driver.transformRequest.bind(this),
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }));

    // Parse broken JSON
    if (resultData && typeof resultData === 'string') {
      resultData = JSON.parse(resultData.replace(/\r|\n/g, ' '));
    }

    if (isErrorResult(resultData)) {
      const humanizedMessage: string | undefined = ERROR_MESSAGE[resultData.errorCode as keyof typeof ERROR_MESSAGE];
      throw new HumanizedError(
        `[Принтер] ${humanizedMessage || 'Неизвестная ошибка'}`,
        `Code ${resultData.errorCode || 'unknown'}; Text: ${resultData.errorText}`,
      );
    }

    return resultData;
  }

  private static transformRequest <T extends { [key: string]: unknown }> (data?: T) {
    if (!data) return;

    const dataAsString = JSON.stringify(data);

    // Need to convert zeros in taxSum because printer accepts only array like [0.00, 0.00, 123.00]
    // but JS always converts 0.00 to 0 and 123.00 to 123
    if (data.taxSum) {
      const lastValue = (data.taxSum as number[]).pop() as number;
      return StarTSP650Driver.convertTaxSumZerosInData(dataAsString, lastValue);
    }

    return dataAsString;
  }

  static convertTaxSumZerosInData (dataAsString: string, taxSumLastValue: number) {
    const taxSumRegExp = /"taxSum":\[.+\]/;

    const taxSumStringMatches = taxSumRegExp.exec(dataAsString);

    if (!taxSumStringMatches) throw new Error('No taxSum in data');

    const convertedTaxSumString = taxSumStringMatches[0]
      .replace(/0,/g, '0.00,')
      .replace(/,(\d+)(?!\.)]$/, `,${taxSumLastValue}.00]`)
      .replace(/\[\d+\]/, `[${taxSumLastValue}.00]`);
    const convertedDataAsString = dataAsString.replace(taxSumRegExp, convertedTaxSumString);
    
    log('info', `[StarTSP650] Converted tax sum string: ${convertedTaxSumString}`);

    return convertedDataAsString;
  }
}

function isErrorResult (resultData: unknown): resultData is TError {
  const { status, errorCode, errorText } = resultData as TError || {};
  return Boolean(status === 'error' && errorCode && errorText);
}

export { ERROR_MESSAGE };
export default StarTSP650Driver;
