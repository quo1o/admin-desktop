import { TCurrency } from '@winstrike/pps-typings/terminal';

type TPosProxyPay = {
  amount: number;
  currency: TCurrency;
  responseCode: string;
  orderId: number;
};

export type { TPosProxyPay };
