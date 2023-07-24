import { EventEmitter } from 'events';

import { IPrinterDriver } from './PrinterDriver';
import Healthchecker from './Healthchecker';
import { IAutoCloseShift } from './AutoCloseShiftWorker';
import PrinterDriverHealthchecker from './PrinterDriverHealthchecker';

abstract class PrinterDriverProxy extends EventEmitter implements IPrinterDriver, IAutoCloseShift {
  constructor (printerDriver: IPrinterDriver, healthchecker?: PrinterDriverHealthchecker) {
    super();

    this.printerDriver = printerDriver;
    this.proxyEvents();
    this.#isInited = false;
    if (healthchecker) this.healthchecker = healthchecker.createHealthchecker(this);
  }

  #isInited: boolean;
  get isInited () {
    return this.#isInited && this.printerDriver.isInited;
  }
  set isInited (value: boolean) {
    this.#isInited = value;
  }
  get address () {
    return this.printerDriver.address;
  }
  get status () {
    return this.printerDriver.status;
  }
  get cashierName () {
    return this.printerDriver.cashierName;
  }
  protected printerDriver: IPrinterDriver;
  private healthchecker?: Healthchecker;

  private proxyEvents () {
    this.printerDriver.on('status-changed', (...args) => {
      this.emit('status-changed', ...args);
    });
    this.printerDriver.on('error', (...args) => {
      this.emit('error', ...args);
    });
  }

  async init (...args: Parameters<IPrinterDriver['init']>) {
    await this.printerDriver.init(...args);
    if (this.healthchecker) this.healthchecker.start();
  }
  healthcheck (...args: Parameters<IPrinterDriver['healthcheck']>) {
    return this.printerDriver.healthcheck(...args);
  }
  refreshStatus (...args: Parameters<IPrinterDriver['refreshStatus']>) {
    return this.printerDriver.refreshStatus(...args);
  }
  configure (...args: Parameters<IPrinterDriver['configure']>) {
    return this.printerDriver.configure(...args);
  }
  printCheck (...args: Parameters<IPrinterDriver['printCheck']>) {
    return this.printerDriver.printCheck(...args);
  }
  printCorrection (...args: Parameters<IPrinterDriver['printCorrection']>) {
    return this.printerDriver.printCorrection(...args);
  }
  withdrawCash (...args: Parameters<IPrinterDriver['withdrawCash']>) {
    return this.printerDriver.withdrawCash(...args);
  }
  depositCash (...args: Parameters<IPrinterDriver['depositCash']>) {
    return this.printerDriver.depositCash(...args);
  }
  openShift (...args: Parameters<IPrinterDriver['openShift']>) {
    return this.printerDriver.openShift(...args);
  }
  closeShift (...args: Parameters<IPrinterDriver['closeShift']>) {
    return this.printerDriver.closeShift(...args);
  }
  printXReport (...args: Parameters<IPrinterDriver['printXReport']>) {
    return this.printerDriver.printXReport(...args);
  }
  printZReport (...args: Parameters<IPrinterDriver['printZReport']>) {
    return this.printerDriver.printZReport(...args);
  }
}

export default PrinterDriverProxy;
