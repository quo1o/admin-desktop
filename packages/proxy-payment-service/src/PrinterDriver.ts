import { EventEmitter } from 'events';
import type { TConfig, TCheckParams, TCorrectionParams } from '@winstrike/pps-typings/printer';

import { IAutoCloseShift } from './AutoCloseShiftWorker';
import Healthchecker from './Healthchecker';
import PrinterDriverHealthchecker from './PrinterDriverHealthchecker';
import CashierActions from './typings/cashier-actions';

interface IPrinterDriver extends CashierActions {
  readonly isInited: boolean;
  readonly address: string;
  readonly status?: TStatus;
  readonly cashierName: string;

  init (): Promise<void>;
  healthcheck (): Promise<void>;
  refreshStatus (): Promise<TStatus>;
  printCheck (params: TCheckParams): Promise<void>;
  printCorrection (params: TCorrectionParams): Promise<void>;
  openShift (): Promise<void>;
  closeShift (): Promise<void>;

  // Status changed event
  on(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  once(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  off(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  addListener(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  removeListener(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;

  // Connection error event
  on(event: 'error', listener: (error: Error) => void): IPrinterDriver;
  once(event: 'error', listener: (error: Error) => void): IPrinterDriver;
  off(event: 'error', listener: (error: Error) => void): IPrinterDriver;
  addListener(event: 'error', listener: (error: Error) => void): IPrinterDriver;
  removeListener(event: 'error', listener: (error: Error) => void): IPrinterDriver;
}

type TProps = {
  address: string;
  healthchecker?: PrinterDriverHealthchecker;
  shouldResetConfig: boolean;
};

type TShiftStatus = 'opened' | 'closed';

type TStatus = {
  shiftOpenedAt: Date;
  shiftStatus: TShiftStatus;
};

declare interface PrinterDriver {
  // Status changed event
  on(event: 'status-changed', listener: (status?: TStatus) => void): this;
  once(event: 'status-changed', listener: (status?: TStatus) => void): this;
  off(event: 'status-changed', listener: (status?: TStatus) => void): this;
  addListener(event: 'status-changed', listener: (status?: TStatus) => void): this;
  removeListener(event: 'status-changed', listener: (status?: TStatus) => void): this;
  emit(event: 'status-changed', status?: TStatus): boolean;

  // Connection error event
  on(event: 'error', listener: (error: Error) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  off(event: 'error', listener: (error: Error) => void): this;
  addListener(event: 'error', listener: (error: Error) => void): this;
  removeListener(event: 'error', listener: (error: Error) => void): this;
  emit(event: 'error', error: Error): boolean;
}

abstract class PrinterDriver extends EventEmitter implements IAutoCloseShift, IPrinterDriver {
  constructor ({ address, healthchecker, shouldResetConfig }: TProps) {
    super();

    this.address = address;
    this.isInited = false;
    this.cashierName = '';
    this.shouldResetConfig = shouldResetConfig;

    if (healthchecker) this.healthchecker = healthchecker.createHealthchecker(this);
  }

  isInited: boolean;
  address: string;
  cashierName: string;
  private healthchecker?: Healthchecker;
  private shouldResetConfig: boolean;

  #status?: TStatus;
  set status (newStatus: TStatus | undefined) {
    this.#status = newStatus;
    this.emit('status-changed', newStatus);
  }
  get status () {
    return this.#status;
  }

  async init () {
    await this.healthcheck();
    this.isInited = true;
    if (this.healthchecker) this.healthchecker.start();
    if (this.shouldResetConfig) await this.configure({ headerText: [] });
  }

  abstract async healthcheck (): Promise<void>;
  abstract async refreshStatus (): Promise<TStatus>;
  abstract async configure (config: TConfig): Promise<void>;
  abstract async printCheck (params: TCheckParams): Promise<void>;
  abstract async printCorrection (params: TCorrectionParams): Promise<void>;
  abstract async withdrawCash (amount: number): Promise<void>;
  abstract async depositCash (amount: number): Promise<void>
  abstract async openShift (): Promise<void>;
  abstract async closeShift (): Promise<void>;
  abstract async printXReport (): Promise<void>;
  abstract async printZReport (): Promise<void>;
}

export type { IPrinterDriver, TProps, TShiftStatus, TStatus };
export default PrinterDriver;
