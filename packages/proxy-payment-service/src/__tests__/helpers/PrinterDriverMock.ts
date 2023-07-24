import { EventEmitter } from 'events';
import faker from 'faker';
import { subMinutes } from 'date-fns';

import { IPrinterDriver, TStatus } from '../../PrinterDriver';
import { TConfig } from '@winstrike/pps-typings/printer';

const DEFAULT_STATUS: TStatus = {
  shiftOpenedAt: subMinutes(new Date(), 15),
  shiftStatus: 'opened',
};

class PrinterDriverMock extends EventEmitter implements IPrinterDriver {
  constructor () {
    super();
  
    this.isInited = false;
    this.address = faker.internet.ip();
    this.cashierName = '';
  }

  isInited: boolean;
  address: string;
  cashierName: string;
  #status?: TStatus;
  set status (newStatus: TStatus | undefined) {
    this.#status = newStatus;
    this.emit('status-changed', newStatus);
  }
  get status () {
    return this.#status;
  }

  init () {
    this.isInited = true;
    this.status = DEFAULT_STATUS;
    return Promise.resolve();
  }
  healthcheck () {
    return Promise.resolve();
  }
  refreshStatus () {
    this.status = this.status || DEFAULT_STATUS;
    return Promise.resolve(this.status);
  }
  configure ({ cashierName }: TConfig) {
    if (cashierName) this.cashierName = cashierName;
    return Promise.resolve();
  }
  printCheck () {
    return Promise.resolve();
  }
  printCorrection () {
    return Promise.resolve();
  }
  withdrawCash () {
    return Promise.resolve();
  }
  depositCash () {
    return Promise.resolve();
  }
  openShift () {
    return Promise.resolve();
  }
  closeShift () {
    return Promise.resolve();
  }
  printXReport () {
    return Promise.resolve();
  }
  printZReport () {
    return Promise.resolve();
  }
}

export default PrinterDriverMock;
