import { TProps, IPrinterDriver } from './PrinterDriver';
import MoySkladIntegration, { MoySkladParams } from './MoySklad';
import printerDriverByModel, { PrinterModel } from './printer-drivers';
import MoySkladDB from './db/MoySkladDB';
import AutoCloseShiftWorker from './AutoCloseShiftWorker';
import { createHealthchecker } from './PrinterDriverHealthchecker';

type Props = {
  printerModel: PrinterModel;
  printerDriverProps: Omit<TProps, 'healthchecker'>;
  shouldHealthcheck: boolean;
  shouldAutoCloseShift: boolean;
  moySkladParams?: MoySkladParams;
  ppsId: string;
};

class PrinterDriverFactory {
  createPrinterDriver ({
    printerModel, printerDriverProps, shouldHealthcheck, shouldAutoCloseShift, moySkladParams, ppsId,
  }: Props): IPrinterDriver {
    const hasProxy = moySkladParams;

    const healthchecker = shouldHealthcheck && { createHealthchecker };

    const printerDriver = new printerDriverByModel[printerModel]({
      address: printerDriverProps.address,
      shouldResetConfig: printerDriverProps.shouldResetConfig,
      ...(healthchecker && !hasProxy && { healthchecker }),
    });

    let printerDriverWithProxies: IPrinterDriver | void;

    if (moySkladParams) {
      printerDriverWithProxies = new MoySkladIntegration(
        printerDriver,
        new MoySkladDB(),
        moySkladParams,
        ppsId,
        healthchecker || undefined,
      );
    }

    if (shouldAutoCloseShift) new AutoCloseShiftWorker({ printerDriver: printerDriverWithProxies || printerDriver });

    return printerDriverWithProxies || printerDriver;
  }
}

export default PrinterDriverFactory;
