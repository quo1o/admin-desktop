import type { TCurrency } from '@winstrike/pps-typings/terminal';

interface ITerminalDriver {
  readonly isInited: boolean;
  readonly address: string;

  init (): Promise<void>;
  pay (amount: number, currency: TCurrency): Promise<string>;
  refund (invoiceId: string, amount: number, currency: TCurrency): Promise<void>;
  cancel (invoiceId: string, amount: number, currency: TCurrency): Promise<void>;
  verificateResults (): Promise<void>;
}

type TProps = {
  address: string;
  acquiringAdapter: ITerminalDriver;
};

abstract class TerminalDriver implements ITerminalDriver {
  constructor ({ address, acquiringAdapter }: TProps) {
    this.isInited = false;
    this.address = address;
    this.acquiringAdapter = acquiringAdapter;
  }

  isInited: boolean;
  address: string;
  protected acquiringAdapter: ITerminalDriver;

  abstract init (): Promise<void>;
  abstract pay (amount: number, currency: TCurrency): Promise<string>;
  abstract refund (invoiceId: string, amount: number, currency: TCurrency): Promise<void>;
  abstract cancel (invoiceId: string, amount: number, currency: TCurrency): Promise<void>;
  abstract verificateResults (): Promise<void>;
}

export type { TProps, ITerminalDriver };
export default TerminalDriver;
