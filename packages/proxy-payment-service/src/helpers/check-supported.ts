import terminalDriverByModel, { TerminalModel } from '../terminal-drivers';
import printerDriverByModel, { PrinterModel } from '../printer-drivers';
import { Acquiring, ACQUIRING } from '../TerminalDriverFactory';

const terminalModels = Object.keys(terminalDriverByModel) as TerminalModel[];
const printerModels = Object.keys(printerDriverByModel) as PrinterModel[];

function isSupportedTerminalModel (terminalModel: string): terminalModel is TerminalModel {
  return terminalModels.includes(terminalModel as TerminalModel);
}

function isSupportedPrinterModel (printerModel: string): printerModel is PrinterModel {
  return printerModels.includes(printerModel as PrinterModel);
}

function isSupportedAcquiring (acquiring: string): acquiring is Acquiring {
  return ACQUIRING.includes(acquiring as Acquiring);
}

export { terminalModels, printerModels, isSupportedTerminalModel, isSupportedPrinterModel, isSupportedAcquiring };
