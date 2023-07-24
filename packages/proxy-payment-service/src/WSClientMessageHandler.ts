import { TServerMessage, TClientMessage, TPaySuccessBody } from '@winstrike/pps-typings/ws-client';

import { IOperationsStorage } from './OperationsStorage';
import { ITerminalDriver } from './TerminalDriver';
import { IPrinterDriver } from './PrinterDriver';
import { IKkmServer } from './KkmServer';
import { reportError } from './error-reporter';
import { getErrorBody } from './helpers';
import HumanizedError from './HumanizedError';

interface IWSClientMessageHandler {
  init (): Promise<void>;
  handleMessage (data: TServerMessage): Promise<TClientMessage>;
}

class WSClientMessageHandler implements IWSClientMessageHandler {
  constructor (operationsStorage: IOperationsStorage, handleSpecificMessage: IWSClientMessageHandler['handleMessage']) {
    this.operationsStorage = operationsStorage;
    this.handleSpecificMessage = handleSpecificMessage;
  }

  private operationsStorage: IOperationsStorage;
  private handleSpecificMessage: IWSClientMessageHandler['handleMessage'];

  async init () {
    await this.operationsStorage.init();
  }

  async handleMessage (data: TServerMessage): Promise<TClientMessage> {
    try {
      const existOperation = await this.syncWithOperationsStorage(data);
      if (existOperation) return existOperation;
    } catch (e) {
      reportError(e, '[WS]');
    }

    let clientMessage: TClientMessage;
    try {
      clientMessage = await this.handleSpecificMessage(data);
    } catch (e) {
      const errorBody = getErrorBody(e);

      await this.operationsStorage.update({
        id: data.operationId,
        type: data.type,
        status: 'error',
        body: errorBody,
      }).catch(e => reportError(e, '[WS]'));

      return { type: data.type, status: 'error', body: errorBody };
    }

    await this.operationsStorage.update({
      id: data.operationId,
      type: data.type,
      status: 'success',
      body: (clientMessage as TClientMessage & { body?: TPaySuccessBody }).body,
    }).catch(e => reportError(e, '[WS]'));

    return clientMessage;
  }

  private async syncWithOperationsStorage (data: TServerMessage): Promise<TClientMessage | void> {
    const existOperation = await this.operationsStorage.addUnique({
      id: data.operationId,
      type: data.type,
      status: 'pending',
    });

    if (existOperation) {
      if (existOperation.status === 'pending') {
        return {
          type: data.type,
          status: 'error',
          body: {
            message: 'Operation may have been done',
            humanizedMessage: 'Операция с устройством возможно была выполнена',
          },
        };
      }

      return {
        type: data.type,
        status: existOperation.status,
        body: existOperation.body,
      } as TClientMessage;
    }

    return existOperation;
  }
}

function getClassicMessageHandler (terminalDriver: ITerminalDriver, printerDriver: IPrinterDriver) {
  return async (data: TServerMessage): Promise<TClientMessage> => {
    if (['pay', 'refund', 'cancel'].includes(data.type) && !printerDriver.cashierName) {
      throw new HumanizedError(
        'Пожалуйста, укажите настоящее имя кассира в Winstrike ID в формате: Иванов А.Б.', 
        'Invalid cashier name',
      );
    }

    switch (data.type) {
      case 'pay': {
        const invoiceId = await terminalDriver.pay(data.body.amount, data.body.currency);
        return { type: data.type, status: 'success', body: { invoiceId } };
      }
      case 'refund':
        await terminalDriver.refund(data.body.invoiceId, data.body.amount, data.body.currency);
        break;
      case 'cancel':
        await terminalDriver.cancel(data.body.invoiceId, data.body.amount, data.body.currency);
        break;
      case 'configure-printer':
        await printerDriver.configure({ headerText: data.body.headerText });
        break;
      case 'print-check':
        await printerDriver.printCheck(data.body);
        break;
      case 'print-correction':
        await printerDriver.printCorrection(data.body);
        break;
      default:
        return { type: 'error', body: { message: 'Invalid message type' } };
    }

    return { type: data.type, status: 'success' };
  };
}

function getKKMServerMessageHandler (kkmServer: IKkmServer) {
  return async (data: TServerMessage): Promise<TClientMessage> => {
    switch (data.type) {
      case 'configure-printer':
        await kkmServer.configure({ headerText: data.body.headerText });
        break;
      case 'register-check': {
        const invoiceId = await kkmServer.registerCheck(data.body);
        return { type: data.type, status: 'success', body: { invoiceId } };
      }
      case 'print-correction':
        await kkmServer.printCorrection(data.body);
        break;
      default:
        return { type: 'error', body: { message: 'Invalid message type' } };
    }

    return { type: data.type, status: 'success' };
  };
}

export { IWSClientMessageHandler, WSClientMessageHandler, getClassicMessageHandler, getKKMServerMessageHandler };
