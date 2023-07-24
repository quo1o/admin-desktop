import { ITerminalDriver } from '../TerminalDriver';
import { IPrinterDriver } from '../PrinterDriver';
import TerminalDriverMock from './helpers/TerminalDriverMock';
import PrinterDriverMock from './helpers/PrinterDriverMock';
import AutoResultsVerification from '../AutoResultsVerification';

describe('auto verification of results', () => {
  let verificateResultsMock: jest.Mock;
  let autoResultsVerification: AutoResultsVerification;
  let terminalDriver: ITerminalDriver;
  let printerDriver: IPrinterDriver;

  beforeEach(() => {
    verificateResultsMock = jest.fn(() => Promise.resolve());
    terminalDriver = new TerminalDriverMock();
    terminalDriver.verificateResults = verificateResultsMock;
    printerDriver = new PrinterDriverMock();
    autoResultsVerification = new AutoResultsVerification({
      terminalDriver,
      printerDriver,
    });
    autoResultsVerification.startWatchPrinterStatus();
  });

  it('should make verification when shift transition opened -> closed', async () => {
    // First status refreshing - sets default status with opened shift
    await printerDriver.refreshStatus();

    // Second status refreshing - sets status with closed shift
    printerDriver.refreshStatus = jest.fn(function (this: PrinterDriverMock) {
      this.status = {
        shiftOpenedAt: this.status?.shiftOpenedAt || new Date(),
        shiftStatus: 'closed',
      };
      return Promise.resolve(this.status);
    });
    await printerDriver.refreshStatus();

    expect(verificateResultsMock).toHaveBeenCalledTimes(1);
  });

  it('should not make verification when shift transition closed -> opened', async () => {
    // First status refreshing - sets status with closed shift
    printerDriver.refreshStatus = jest.fn(function (this: PrinterDriverMock) {
      this.status = {
        shiftOpenedAt: this.status?.shiftOpenedAt || new Date(),
        shiftStatus: 'closed',
      };
      return Promise.resolve(this.status);
    });
    await printerDriver.refreshStatus();

    // Second status refreshing - sets status with opened shift
    printerDriver.refreshStatus = jest.fn(function (this: PrinterDriverMock) {
      this.status = {
        shiftOpenedAt: new Date(),
        shiftStatus: 'opened',
      };
      return Promise.resolve(this.status);
    });
    await printerDriver.refreshStatus();

    expect(verificateResultsMock).toHaveBeenCalledTimes(0);
  });

  it('should not make verification when shift transition undefined -> opened', async () => {
    // Status refreshing - sets status with opened shift
    printerDriver.refreshStatus = jest.fn(function (this: PrinterDriverMock) {
      this.status = {
        shiftOpenedAt: new Date(),
        shiftStatus: 'opened',
      };
      return Promise.resolve(this.status);
    });
    await printerDriver.refreshStatus();

    expect(verificateResultsMock).toHaveBeenCalledTimes(0);
  });

  it('should not make verification when shift transition undefined -> closed', async () => {
    // Status refreshing - sets status with closed shift
    printerDriver.refreshStatus = jest.fn(function (this: PrinterDriverMock) {
      this.status = {
        shiftOpenedAt: this.status?.shiftOpenedAt || new Date(),
        shiftStatus: 'closed',
      };
      return Promise.resolve(this.status);
    });
    await printerDriver.refreshStatus();

    expect(verificateResultsMock).toHaveBeenCalledTimes(0);
  });
});
