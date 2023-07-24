import type { TCurrency } from '@winstrike/pps-typings/terminal';

import TerminalDriver from '../TerminalDriver';
import { validatePayParams } from '../validator';

class PAXSP30Driver extends TerminalDriver {
  async init () {
    await this.acquiringAdapter.init();
    this.isInited = true;
  }

  async pay (amount: number, currency: TCurrency) {
    await validatePayParams(amount, currency);
    return this.acquiringAdapter.pay(amount, currency);
  }

  async refund (invoiceId: string, amount: number, currency: TCurrency) {
    await validatePayParams(amount, currency);
    return this.acquiringAdapter.refund(invoiceId, amount, currency);
  }

  async cancel (invoiceId: string, amount: number, currency: TCurrency) {
    await validatePayParams(amount, currency);
    return this.acquiringAdapter.cancel(invoiceId, amount, currency);
  }

  verificateResults () {
    return this.acquiringAdapter.verificateResults();
  }
}

export default PAXSP30Driver;
