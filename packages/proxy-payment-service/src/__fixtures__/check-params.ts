import type { TCheckParams } from '@winstrike/pps-typings/printer';
import type { TCheckParams as TStarTSP650CheckParams } from '../typings/printer/StarTSP650';

const CHECK_PARAMS: TCheckParams = {
  type: 'income',
  items: [
    {
      name: 'computer',
      count: 2,
      price: 100,
      tax: '20%',
      subjectSign: 4,
    },
  ],
  paymentMethod: 'cash',
  content: ['', '', ''],
};

const STAR_TSP650_CHECK_PARAMS: TStarTSP650CheckParams = {
  docType: 2,
  items: [
    {
      name: 'computer',
      count: 2,
      price: 100,
      subjectSign: 4,
      taxes: [1, 0, 0, 0, 0, 0],
    },
  ],
  cash: 200,
  text: ['', '', ''],
  userName: 'Иванов А.Б.',
};

export { CHECK_PARAMS, STAR_TSP650_CHECK_PARAMS };
