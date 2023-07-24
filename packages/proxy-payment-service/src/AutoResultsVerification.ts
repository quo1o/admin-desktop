import { IPrinterDriver, TStatus } from './PrinterDriver';
import { ITerminalDriver } from './TerminalDriver';
import { reportError } from './error-reporter';

type Props = {
  terminalDriver: ITerminalDriver;
  printerDriver: IPrinterDriver;
};

/**
 * Makes results verification after shift closed
 */
class AutoResultsVerification {
  constructor ({ terminalDriver, printerDriver }: Props) {
    this.terminalDriver = terminalDriver;
    this.printerDriver = printerDriver;
    this.prevPrinterStatus = printerDriver.status;
  }

  private terminalDriver: ITerminalDriver;
  private printerDriver: IPrinterDriver;
  private prevPrinterStatus?: TStatus;

  startWatchPrinterStatus () {
    this.printerDriver.on('status-changed', this.onStatusChanged);
  }

  stopWatchPrinterStatus () {
    this.printerDriver.off('status-changed', this.onStatusChanged);
  }

  private onStatusChanged = (status?: TStatus) => {
    const { shiftStatus: prevShiftStatus } = this.prevPrinterStatus || {};
    const { shiftStatus: currentShiftStatus } = status || {};

    if (prevShiftStatus === 'opened' && currentShiftStatus === 'closed') {
      this.terminalDriver.verificateResults().catch(reportError);
    }

    this.prevPrinterStatus = status;
  }
}

export default AutoResultsVerification;
