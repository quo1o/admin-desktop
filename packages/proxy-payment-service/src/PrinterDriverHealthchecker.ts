import PrinterDriver from './PrinterDriver';
import PrinterDriverProxy from './PrinterDriverProxy';
import Healthchecker from './Healthchecker';

/**
 * Adapter of Healthchecker for PrinterDriver
 */
interface PrinterDriverHealthchecker {
  createHealthchecker (printerDriver: PrinterDriver | PrinterDriverProxy): Healthchecker;
}

const createHealthchecker: PrinterDriverHealthchecker['createHealthchecker'] = (printerDriver) => {
  return new Healthchecker({
    healthcheck: printerDriver.healthcheck.bind(printerDriver),
    onHealthCheckFailed: onHealthcheckFailed.bind(printerDriver),
  });
};

function onHealthcheckFailed (this: PrinterDriver | PrinterDriverProxy, error: Error) {
  this.isInited = false;
  this.emit('error', error);
}

export { createHealthchecker };
export default PrinterDriverHealthchecker;
