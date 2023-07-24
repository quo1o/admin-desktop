import faker from 'faker';

import { ITerminalDriver } from '../../TerminalDriver';

class TerminalDriverMock implements ITerminalDriver {
  constructor () {
    this.isInited = false;
    this.address = faker.internet.ip();
  }

  isInited: boolean;
  address: string;

  init () {
    this.isInited = true;
    return Promise.resolve();
  }
  pay () {
    return Promise.resolve(faker.random.number({ min: 1, max: 999999999 }).toString());
  }
  refund () {
    return Promise.resolve();
  }
  cancel () {
    return Promise.resolve();
  }
  verificateResults () {
    return Promise.resolve();
  }
}

export default TerminalDriverMock;
