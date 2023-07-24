import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidV4 } from 'uuid';
import { format } from 'date-fns';
import { TCheckParams } from '@winstrike/pps-typings/printer';

import { SalePoint, TokenAttached } from './typings/moy-sklad';
import { IPrinterDriver } from './PrinterDriver';
import PrinterDriverProxy from './PrinterDriverProxy';
import { IDB } from './db/DB';
import { MoySkladDBSchema } from './db/MoySkladDB';
import { incrementStringNumber, calculateTotal } from './helpers';
import { logRequests } from './logger';
import HumanizedError from './HumanizedError';
import PrinterDriverHealthchecker from './PrinterDriverHealthchecker';
import { reportError } from './error-reporter';

type MoySkladParams = {
  url: string;
  salePointId: string;
  login: string;
  password: string;
};

class MoySkladIntegration extends PrinterDriverProxy {
  constructor (
    printerDriver: IPrinterDriver,
    db: IDB<MoySkladDBSchema>,
    { url, salePointId, login, password }: MoySkladParams,
    ppsId: string,
    healthchecker?: PrinterDriverHealthchecker,
  ) {
    super(printerDriver, healthchecker);

    this.url = url;
    this.salePointId = salePointId;
    this.login = login;
    this.password = password;
    this.db = db;
    this.axios = Axios.create({ baseURL: url });
    logRequests(this.axios);
    this.ppsId = ppsId;
  }

  url: string;
  salePointId: string;
  login: string;
  private password: string;
  private db: IDB<MoySkladDBSchema>;
  private axios: AxiosInstance;
  private ppsId: string;

  async init () {
    await super.init();
    await this.attachToken();
    // Check authorization
    try {
      await this.axios.get<SalePoint>('/settings/retailstore');
    } catch (e) {
      throw new Error(`[Мой склад] ${e.message}`);
    } 
    await this.db.init();
    await this.syncShift();
    this.isInited = true;
  }

  private async attachToken () {
    const result = await this.axios.post<TokenAttached>(
      `/admin/attach/${this.salePointId}`,
      null,
      {
        auth: {
          username: this.login,
          password: this.password,
        },
      },
    );

    Object.assign(this.axios.defaults, {
      headers: {
        'Lognex-Pos-Auth-Token': result.data.token,
        'Lognex-Pos-Auth-Cashier-Uid': this.login,
        'Content-Type': 'application/json',
      },
    });

    return result.data.token;
  }

  private async syncShift () {
    const syncId = await this.db.get('syncId');
    const shiftNumber = await this.db.get('shiftNumber');

    if (syncId && this.status?.shiftStatus === 'closed') {
      await this.request('put', '/rpc/closeshift', {
        retailShift: {
          meta: {
            href: `${this.url}/entity/retailshift/syncid/${syncId}`,
          },
        },
        // TODO: replace to closed_at from printer
        closemoment: getMoment(new Date()),
      });

      await this.db.set('syncId', undefined);
    }
    
    if (!syncId && this.status?.shiftStatus === 'opened') {
      const newSyncId = uuidV4();
      const newShiftNumber = incrementStringNumber(shiftNumber || '000000000');

      await this.request('put', '/rpc/openshift', {
        retailShift: {
          meta: {
            href: `${this.url}/entity/retailshift/syncid/${newSyncId}`,
          },
        },
        name: newShiftNumber,
        openmoment: getMoment(this.status.shiftOpenedAt),
      });

      await this.db.set('syncId', newSyncId);
      await this.db.set('shiftNumber', newShiftNumber);
    }
  }

  async printCheck (params: TCheckParams) {
    await this.printerDriver.printCheck(params);
    await this.syncShift();

    if (params.withoutStoreIntegration) return;

    params.items.forEach((item) => {
      if (!item.moySklad) throw new HumanizedError(`Товар ${item.name} не имеет синхронизации с Мой Склад`);
    });

    const action = params.type === 'income' ? 'retaildemand' : 'retailsalesreturn';
    const syncId = await this.db.get('syncId');
    const number = await this.db.get(action === 'retaildemand' ? 'saleNumber' : 'refundNumber');
    const newNumber = incrementStringNumber(number || '000000000');
    const total = calculateTotal(params.items) * 100;

    await this.request('post', `/entity/${action}`, {
      meta: {
        href: `${this.url}/entity/${action}/syncid/${uuidV4()}`,
      },
      retailShift: {
        meta: {
          href: `${this.url}/entity/retailshift/syncid/${syncId}`,
        },
      },
      name: newNumber,
      moment: getMoment(new Date()),
      positions: params.items.map(({ price, count, moySklad }) => ({
        assortment: {
          meta: {
            href: `${this.url}/entity/${moySklad?.type}/${moySklad?.id}`,
            mediaType: 'application/json',
          },
        },
        quantity: count,
        price: price * 100,
      })),
      ...(params.paymentMethod === 'card' ? { noCashSum: total } : { cashSum: total }),
    });

    this.db.set(action === 'retaildemand' ? 'saleNumber' : 'refundNumber', newNumber)
      .catch((e) => {
        reportError(e, '[MoySkladIntegration]');
      });
  }

  async withdrawCash (amount: number) {
    const syncId = await this.db.get('syncId');

    if (!syncId) throw new Error('Невозможно выполнить операцию с денежным ящиком при закрытой смене');

    await this.printerDriver.withdrawCash(amount);

    const withdrawNumber = await this.db.get('withdrawNumber');
    // TODO: really need? Maybe need to use usual number?
    const newWithdrawNumber = incrementStringNumber(withdrawNumber || '000000000');

    await this.request('post', '/entity/retaildrawercashout', {
      meta: {
        href: `${this.url}/entity/retaildrawercashout/syncid/${uuidV4()}`,
      },
      retailShift: {
        meta: {
          href: `${this.url}/entity/retailshift/syncid/${syncId}`,
        },
      },
      name: newWithdrawNumber,
      moment: getMoment(new Date()),
      sum: amount * 100,
    });
    await this.db.set('withdrawNumber', newWithdrawNumber);
  }

  async depositCash (amount: number) {
    const syncId = await this.db.get('syncId');

    if (!syncId) throw new Error('Невозможно выполнить операцию с денежным ящиком при закрытой смене');

    await this.printerDriver.depositCash(amount);

    const depositNumber = await this.db.get('depositNumber');
    const newDepositNumber = incrementStringNumber(depositNumber || '000000000');

    await this.request('post', '/entity/retaildrawercashin', {
      meta: {
        href: `${this.url}/entity/retaildrawercashin/syncid/${uuidV4()}`,
      },
      retailShift: {
        meta: {
          href: `${this.url}/entity/retailshift/syncid/${syncId}`,
        },
      },
      name: newDepositNumber,
      moment: getMoment(new Date()),
      sum: amount * 100,
    });
    await this.db.set('depositNumber', newDepositNumber);
  }

  async printZReport () {
    await this.printerDriver.printZReport();
    await this.syncShift();
  }

  async openShift () {
    await this.printerDriver.openShift();
    await this.syncShift();
  }

  async closeShift () {
    await this.printerDriver.closeShift();
    await this.syncShift();
  }

  private async request (method: 'get' | 'post' | 'put', path: string, body?: any): Promise<AxiosResponse | void> {
    let result: AxiosResponse | void;
    try {
      result = method === 'get'
        ? await this.axios[method](path)
        : await this.axios[method](path, body);
    } catch (e) {
      if (e.response?.status === 401) {
        await this.attachToken();
        return this.request(method, path, body);
      }
      throw e;
    }

    return result;
  }
}

function getMoment (date: Date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export { MoySkladParams };
export default MoySkladIntegration;
