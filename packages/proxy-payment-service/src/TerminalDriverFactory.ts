import { TProps, ITerminalDriver } from './TerminalDriver';
import POSProxy from './POSProxy';
import terminalDriverByModel, { TerminalModel } from './terminal-drivers';
import SbPilot from './SbPilot';
import SbPilotOperationStatusChecker from './SbPilotOperationStatusChecker';
import { ArrayElementType } from './typings/utils';
import AutoResultsVerification from './AutoResultsVerification';
import { IPrinterDriver } from './PrinterDriver';

type Acquiring = ArrayElementType<typeof ACQUIRING>;

type Props = {
  terminalModel: TerminalModel;
  terminalDriverProps: Omit<TProps, 'acquiringAdapter'>;
  acquiring: Acquiring;
  // Need for auto results verification
  printerDriver: IPrinterDriver;
};

const ACQUIRING = ['cassby', 'sber'] as const;

class TerminalDriverFactory {
  createTerminalDriver ({
    terminalModel, terminalDriverProps, acquiring, printerDriver,
  }: Props): ITerminalDriver {
    const sbPilotVersion = '31.11';

    const acquiringAdapter = acquiring === 'cassby'
      ? new POSProxy({ address: terminalDriverProps.address })
      : new SbPilot({
        address: terminalDriverProps.address,
        operationStatusChecker: new SbPilotOperationStatusChecker({ sbPilotVersion }),
        sbPilotVersion,
      });

    const terminalDriver = new terminalDriverByModel[terminalModel]({
      address: terminalDriverProps.address,
      acquiringAdapter,
    });

    if (acquiring === 'sber') {
      const autoResultsVerification = new AutoResultsVerification({ terminalDriver, printerDriver });
      autoResultsVerification.startWatchPrinterStatus();
    }

    return terminalDriver;
  }
}

export { ACQUIRING, Acquiring };
export default TerminalDriverFactory;
