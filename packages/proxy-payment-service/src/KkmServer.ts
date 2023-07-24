import Axios, { AxiosInstance, AxiosError } from 'axios';
import { customAlphabet } from 'nanoid';
import retryPromise from 'promise-retry';
import { TCheckParams, TCheckItem, TTax, TCorrectionParams, TConfig, TCheckText } from '@winstrike/pps-typings/printer';

import {
  CorrectionTax,
  RegisterCheckReq,
  RegisterCheckRes,
  ListReq,
  ListResItem,
  ListRes,
  CashBoxReq,
  XReportReq,
  ShiftReq,
  CorrectionCheckReq,
  CommonResponse,
  CheckString,
  Tax,
  CommonRequest,
  GetRezultRes,
} from './typings/kkm-server';
import HumanizedError from './HumanizedError';
import { calculateTotal, exponentialRound } from './helpers';
import CashierActions from './typings/cashier-actions';
import { validateConfigure, validateCheckParams, validateCorrectionParams, validateAmount } from './validator';
import { taxCalculation } from './tax';
import { logRequests, log } from './logger';

interface IKkmServer extends CashierActions {
  readonly cashierName: string;

  init (): Promise<void>;
  registerCheck (params: TCheckParams): Promise<string | undefined>;
  printCorrection (params: TCorrectionParams): Promise<void>;
}

type Props = {
  url?: string;
  checkingResultRetriesCount?: number;
};

const idAlphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const taxToTaxField: Record<TTax, keyof CorrectionTax> = {
  '20%': 'SumTax20',
  '10%': 'SumTax10',
  '20/120': 'SumTax120',
  '10/110': 'SumTax110',
  '0%': 'SumTax0',
  'Без НДС': 'SumTaxNone',
};

class KkmServer implements IKkmServer {
  constructor ({ url = 'http://localhost:5893', checkingResultRetriesCount = 60 }: Props = {}) {
    this.cashierName = '';
    this.axios = Axios.create({ baseURL: url, timeout: 100000, auth: { username: 'User', password: '' } });
    logRequests(this.axios);
    this.checkingResultRetriesCount = checkingResultRetriesCount;
    this.devicesList = [];
  }

  cashierName: string;
  private axios: AxiosInstance;
  private checkingResultRetriesCount: number;
  private getIdCommand = customAlphabet(idAlphabet, 30);
  private devicesList: ListResItem[];
  private get firstDevice () {
    return this.devicesList[0];
  }
  private get isEvotorKKM () {
    return Boolean(this.firstDevice?.IdTypeDevice === 'Evotor');
  }
  private get defaultTaxVariant () {
    return this.firstDevice?.TaxVariant || '';
  }

  async init () {
    this.devicesList = await this.getDevicesList();
  }

  async configure (config: TConfig) {
    await validateConfigure(config);

    const { cashierName } = config;

    if (cashierName) this.cashierName = cashierName;
  }

  async registerCheck (params: TCheckParams) {
    await validateCheckParams(params);

    const total = calculateTotal(params.items);

    const requestData: RegisterCheckReq = {
      Command: 'RegisterCheck',
      Timeout: 90,
      IdCommand: this.getIdCommand(),
      IsFiscalCheck: true,
      TypeCheck: params.type === 'income' ? 0 : 1,
      NotPrint: false,
      CashierName: this.cashierName,
      ...(this.isEvotorKKM && { TaxVariant: this.defaultTaxVariant }),
      CheckStrings: [
        ...KkmServer.convertCheckItems(params.items),
        ...(!this.isEvotorKKM && params.content ? params.content.map(str => ({ PrintText: { Text: str } })) : []),
      ],
      ...(params.paymentMethod === 'card' ? { ElectronicPayment: total } : { Cash: total }),
    };

    const {
      RezultProcessing, ElectronicPayment,
    } = await this.executeCommand<RegisterCheckRes, RegisterCheckReq>(requestData);

    if (this.isEvotorKKM && params.content) {
      await this.registerNonFiscalCheck(params.content);
    }

    if (RezultProcessing?.RRNCode && RezultProcessing?.AuthorizationCode) {
      return `${RezultProcessing.RRNCode}:${RezultProcessing.AuthorizationCode}`;
    }
    if (ElectronicPayment > 0) {
      return 'unknown';
    }
  }

  private async getDevicesList () {
    const requestData: ListReq = {
      IdCommand: this.getIdCommand(),
      Command: 'List',
      Active: true,
      OnOff: true,
    };

    const { ListUnit } = await this.executeCommand<ListRes, ListReq>(requestData);

    return ListUnit;
  }

  // Needed to print additional info on Evotor KKM's
  private async registerNonFiscalCheck (content: TCheckText) {
    const requestData: RegisterCheckReq = {
      Command: 'RegisterCheck',
      IdCommand: this.getIdCommand(),
      IsFiscalCheck: false,
      TypeCheck: 0,
      NotPrint: false,
      CashierName: this.cashierName,
      CheckStrings: [
        { PrintText: { Text: ' ' } },
        { PrintText: { Text: ' ' } },
        ...content.map(str => ({ PrintText: { Text: str.toUpperCase() } })),
        { PrintText: { Text: ' ' } },
        { PrintText: { Text: ' ' } },
      ],
    };

    await this.executeCommand<RegisterCheckRes, RegisterCheckReq>(requestData);
  }

  async withdrawCash (amount: number) {
    const validationError = validateAmount(amount);
    if (validationError) return Promise.reject(validationError);

    const requestData: CashBoxReq = {
      Command: 'PaymentCash',
      CashierName: this.cashierName,
      Amount: amount,
      IdCommand: this.getIdCommand(),
    };

    await this.executeCommand(requestData);
  }

  async depositCash (amount: number) {
    const validationError = validateAmount(amount);
    if (validationError) return Promise.reject(validationError);

    const requestData: CashBoxReq = {
      Command: 'DepositingCash',
      CashierName: this.cashierName,
      Amount: amount,
      IdCommand: this.getIdCommand(),
    };

    await this.executeCommand(requestData);
  }

  async printXReport () {
    const requestData: XReportReq = {
      Command: 'XReport',
      IdCommand: this.getIdCommand(),
    };

    await this.executeCommand(requestData);
  }

  async printZReport () {
    const requestData: ShiftReq = {
      Command: 'CloseShift',
      CashierName: this.cashierName,
      NotPrint: false,
      IdCommand: this.getIdCommand(),
    };

    await this.executeCommand(requestData);
  }

  async printCorrection (params: TCorrectionParams) {
    await validateCorrectionParams(params);

    const [year, month, day] = params.documentDate;
    const date = new Date([`20${year}`, month, day].join('.')).toISOString();

    const requestData: CorrectionCheckReq = {
      Command: 'RegisterCheck',
      IdCommand: this.getIdCommand(),
      IsFiscalCheck: true,
      TypeCheck: params.operationType === 'income' ? 2 : 12,
      CorrectionType: params.isPrescribed ? 1 : 0,
      NotPrint: false,
      CashierName: this.cashierName,
      CorrectionBaseName: params.documentName,
      CorrectionBaseNumber: params.documentNumber,
      CorrectionBaseDate: date,
      Amount: params.amount,
      ...KkmServer.getTaxSum(params.tax, params.amount),
      ...(params.paymentMethod === 'card' ? { Cash: params.amount } : { ElectronicPayment: params.amount }),
    };

    await this.executeCommand<CommonResponse, CorrectionCheckReq>(requestData);
  }

  private static convertCheckItems (items: TCheckItem[]): CheckString[] {
    return items.map(({ name, count, tax, price, subjectSign }) => ({
      Register: {
        Name: name,
        Quantity: count,
        Amount: exponentialRound(count * price, 2),
        Tax: this.getTax(tax),
        SignMethodCalculation: 4,
        SignCalculationObject: subjectSign,
      },
    }));
  }

  private static getTax (tax: TTax): Tax {
    switch (tax) {
      case '0%': return 0;
      case '10%': return 10;
      case '20%': return 20;
      case '10/110': return 110;
      case '20/120': return 120;
      case 'Без НДС': return -1;
      default: throw new Error('Unknown tax value');
    }
  }

  private static getTaxSum (tax: TTax, amount: number): CorrectionTax {
    const sum = exponentialRound(taxCalculation[tax](amount), 2);
    const taxField = taxToTaxField[tax];
    return { [taxField]: sum };
  }

  private async executeCommand <Res extends CommonResponse, Req extends CommonRequest> (data: Req): Promise<Res> {
    const response = await this.axios.post<Res>('/Execute', data, {
      // For Evotor RegisterCheck request timeout must be much less than data.Timeout
      // We must close connection after short timeout because
      // otherwise we will never get Rezult.Status = 0 in command GetRezult
      ...(this.isEvotorKKM && data.Command === 'RegisterCheck' && { timeout: 10000 }),
    })
      .catch((e: AxiosError<Res>) => {
        // For Evotor we must ignore timeout error
        if (this.isEvotorKKM && e.message.includes('timeout')) {
          log('info', '[Axios] Above error is timeout error and it is a normal behavior for Evotor KKM');
          return;
        }
        throw e;
      });

    const { data: result } = response || {};
    if (result) KkmServer.handleError(result);

    if ((result && [1, 4].includes(result.Status)) || !result) {
      const resultInfo = await retryPromise(async (retry) => {
        const { data: commandResult } = await this.axios.post<GetRezultRes<Res>>('/Execute', {
          Command: 'GetRezult', IdCommand: data.IdCommand,
        });

        KkmServer.handleError(commandResult);
        // After error handling Rezult must be there
        const newResult = commandResult.Rezult!;
  
        if ([1, 4].includes(newResult.Status)) {
          retry(
            new HumanizedError(
              '[KKMServer] Команда все еще в процессе выполнения после множества запросов результата',
              `[KKMServer] Status ${newResult.Status}; Error: Command is in progress`,
            ),
          );
        }

        KkmServer.handleError(newResult);
  
        return newResult;
      }, {
        retries: this.checkingResultRetriesCount,
        minTimeout: 5000,
        maxTimeout: 5000,
      });

      return resultInfo;
    }

    return result;
  }

  private static handleError ({ Status, Error }: CommonResponse) {
    if ([2, 3, 5, 6].includes(Status) || Error) {
      const error =
        (Status === 3 && 'Устройство или команда не найдена') ||
        (Status === 5 && 'Команда была выполнена ранее') ||
        (Status === 6 && 'Ошибка ЕГАИС') ||
        Error?.replace('Message: ', '') ||
        'Неизвестная ошибка';
      throw new HumanizedError(
        `[KKMServer] ${error}`,
        `[KKMServer] Status ${Status}; Error: ${error}`,
      );
    }
  }
}

export { IKkmServer };
export default KkmServer;
