import nock from 'nock';

import type { TerminalModel, PrinterModel } from './main';
import * as persistentMock from './request-mocks/persistent';
import POSProxy from './POSProxy';

type TOptions = {
  terminal: {
    model: TerminalModel;
    address: string;
  };
  printer: {
    model: PrinterModel;
    address: string;
  };
};

const terminalsWithPOSProxy = ['PAXSP30'];

function enableTestMode ({ terminal, printer }: TOptions) {
  nock.enableNetConnect();

  if (terminalsWithPOSProxy.includes(terminal.model)) {
    POSProxy.withPing = false;
    runAllMocks(persistentMock.POSProxy);
  } else {
    // @ts-ignore There are currently no terminals that work without POS Proxy
    runAllMocks(persistentMock[terminal.model], terminal.address);
  }

  runAllMocks(persistentMock[printer.model], printer.address);
}

function runAllMocks (mockObject: persistentMock.TPersistentMockObject, address?: string) {
  Object.values(mockObject).forEach((mock) => { mock(address); });
}

export { enableTestMode };
