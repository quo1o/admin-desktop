import { TConfig } from '@winstrike/pps-typings/printer';

interface CashierActions {
  configure (config: TConfig): Promise<void>;
  withdrawCash (amount: number): Promise<void>;
  depositCash (amount: number): Promise<void>;
  printXReport (): Promise<void>;
  printZReport (): Promise<void>;
}

export default CashierActions;
