import { EventEmitter } from 'events';

import { ITerminalDriver } from './TerminalDriver';
import { IPrinterDriver } from './PrinterDriver';
import { TerminalModel } from './terminal-drivers';
import { IWSClient } from './WSClient';
import { enableTestMode } from './test-mode';
import { logRequests } from './logger';
import PrinterDriverFactory from './PrinterDriverFactory';
import { PrinterModel } from './printer-drivers';
import { MoySkladParams } from './MoySklad';
import TerminalDriverFactory, { Acquiring } from './TerminalDriverFactory';
import WSClientFactory from './WSClientFactory';
import { Mode } from './typings/main';
import KkmServer, { IKkmServer } from './KkmServer';
import CashierActions from './typings/cashier-actions';

type CommonOptions = {
  psUrl: string;
  ppsId: string;
};
type ClassicOptions = CommonOptions & {
  terminal: {
    address: string;
    model: TerminalModel;
    acquiring: Acquiring;
  };
  printer: {
    address: string;
    model: PrinterModel;
    moySkladParams?: MoySkladParams;
    shouldHealthcheck: boolean;
    shouldAutoCloseShift: boolean;
    shouldResetConfig: boolean;
  };
  isTestMode?: boolean;
};
type KKMServerOptions = CommonOptions & {
  checkingResultRetriesCount?: number;
};
type Options<M extends Mode> = M extends 'classic' ? ClassicOptions : KKMServerOptions;

// Declare strict event interface
declare interface ProxyPaymentService<M extends Mode> {
  // Log event
  on(event: 'log', listener: (message: string) => void): this;
  once(event: 'log', listener: (message: string) => void): this;
  addListener(event: 'log', listener: (message: string) => void): this;
  removeListener(event: 'log', listener: (message: string) => void): this;
  emit(event: 'log', message: string): boolean;

  // Lifecycle events
  on(event: 'starting' | 'started' | 'stopping' | 'stopped', listener: () => void): this;
  once(event: 'starting' | 'started' | 'stopping' | 'stopped', listener: () => void): this;
  addListener(event: 'starting' | 'started' | 'stopping' | 'stopped', listener: () => void): this;
  removeListener(event: 'starting' | 'started' | 'stopping' | 'stopped', listener: () => void): this;
  emit(event: 'starting' | 'started' | 'stopping' | 'stopped'): boolean;

  // Error event
  on(event: 'error', listener: (error: Error) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  addListener(event: 'error', listener: (error: Error) => void): this;
  removeListener(event: 'error', listener: (error: Error) => void): this;
  emit(event: 'error', error: Error): boolean;

  // WSClient events (no way to import them from WSClient)
  // Connecting/connected event
  on(event: 'connecting' | 'connected', listener: () => void): this;
  once(event: 'connecting' | 'connected', listener: () => void): this;
  addListener(event: 'connecting' | 'connected', listener: () => void): this;
  removeListener(event: 'connecting' | 'connected', listener: () => void): this;
  emit(event: 'connecting' | 'connected'): boolean;
}

class ProxyPaymentService<M extends Mode = 'classic' | 'kkm-server'> extends EventEmitter {
  constructor (mode: M, options: Options<M>) {
    super();
    const { ppsId, psUrl } = options;

    logRequests();

    if (mode === 'classic') {
      const { terminal, printer, isTestMode } = options as Options<'classic'>;

      if (isTestMode) enableTestMode({ terminal, printer });

      this.printerDriver = new PrinterDriverFactory().createPrinterDriver({
        printerModel: printer.model,
        moySkladParams: printer.moySkladParams,
        printerDriverProps: {
          address: printer.address,
          shouldResetConfig: printer.shouldResetConfig,
        },
        shouldAutoCloseShift: printer.shouldAutoCloseShift,
        shouldHealthcheck: printer.shouldHealthcheck,
        ppsId,
      });
      this.terminalDriver = new TerminalDriverFactory().createTerminalDriver({
        terminalModel: terminal.model,
        terminalDriverProps: {
          address: terminal.address,
        },
        acquiring: terminal.acquiring,
        printerDriver: this.printerDriver,
      });
      this.wsClient = new WSClientFactory().createWSClient(mode, {
        terminalDriver: this.terminalDriver,

        printerDriver: this.printerDriver,
      }, { ppsId, psUrl });
      this.cashierActions = this.printerDriver;
    } else {
      const { checkingResultRetriesCount } = options as Options<'kkm-server'>;

      const kkmServer = new KkmServer({ checkingResultRetriesCount });
      this.kkmServer = kkmServer;
      this.wsClient = new WSClientFactory().createWSClient(mode, { kkmServer }, { ppsId, psUrl });
      this.cashierActions = this.kkmServer;
    }
  }

  readonly cashierActions: CashierActions;
  public get isFree () {
    return this.wsClient.isFree;
  }
  private terminalDriver?: ITerminalDriver;
  private printerDriver?: IPrinterDriver;
  private kkmServer?: IKkmServer;
  private wsClient: IWSClient;

  async start () {
    this.listenEvents();
    this.emit('starting');
    if (this.terminalDriver && this.printerDriver) {
      this.emit('log', 'Инициализация терминала');
      await this.terminalDriver.init();
      this.emit('log', 'Инициализация принтера');
      await this.printerDriver.init();
    }
    if (this.kkmServer) {
      this.emit('log', 'Инициализация KKMServer');
      await this.kkmServer.init();
    }
    this.emit('log', 'Запуск соединения с сервером');
    await this.wsClient.start();
    this.emit('started');
  }

  private listenEvents () {
    this.wsClient.on('connecting', () => {
      this.emit('connecting');
    });
    this.wsClient.on('connected', () => {
      this.emit('connected');
    });
    this.wsClient.on('error', (error) => {
      this.emit('error', error);
    });
    this.printerDriver?.on('error', (error) => {
      this.emit('error', error);
    });
  }

  async stop () {
    this.emit('stopping');
    this.emit('log', 'Остановка соединения с сервером');
    await this.wsClient.stop();
    this.emit('stopped');
  }
}

export type { Options, TerminalModel, Acquiring, PrinterModel };
// TODO: move this checks to PaymentProxyService
export {
  terminalModels,
  printerModels,
  isSupportedTerminalModel,
  isSupportedPrinterModel,
  isSupportedAcquiring,
} from './helpers/check-supported';
export default ProxyPaymentService;
