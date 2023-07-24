import WSClient, { Props as WSCLientProps, IWSClient } from './WSClient';
import OperationsDB, { OperationsDBSchema } from './db/OperationsDB';
import { IDB } from './db/DB';
import OperationsStorage from './OperationsStorage';
import { Mode } from './typings/main';
import { WSClientMessageHandler, getClassicMessageHandler, getKKMServerMessageHandler } from './WSClientMessageHandler';
import { ITerminalDriver } from './TerminalDriver';
import { IPrinterDriver } from './PrinterDriver';
import { IKkmServer } from './KkmServer';

interface WSClientFacrotyCreateDB {
  (): IDB<OperationsDBSchema>;
}

type Props<M extends Mode> = M extends 'classic' ? {
  terminalDriver: ITerminalDriver;
  printerDriver: IPrinterDriver;
} : {
  kkmServer: IKkmServer;
};
class WSClientFactory<M extends Mode> {
  createWSClient (mode: M, props: Props<M>, wsClientProps: Omit<WSCLientProps, 'messageHandler'>): IWSClient {
    const db = WSClientFactory.createOperationsDb();
    const operationsStorage = new OperationsStorage({ db });
    const handleSpecificMessage = mode === 'classic'
      ? getClassicMessageHandler((props as Props<'classic'>).terminalDriver, (props as Props<'classic'>).printerDriver)
      : getKKMServerMessageHandler((props as Props<'kkm-server'>).kkmServer);
    const messageHandler = new WSClientMessageHandler(operationsStorage, handleSpecificMessage);

    return new WSClient({ ...wsClientProps, messageHandler });
  }

  static createOperationsDb: WSClientFacrotyCreateDB = function () {
    return new OperationsDB();
  };
}

export default WSClientFactory;
