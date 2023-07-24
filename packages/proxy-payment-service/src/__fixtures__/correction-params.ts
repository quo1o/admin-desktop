import type { TCorrectionParams as TStarTSP650CorrectionParams } from '../typings/printer/StarTSP650';

const STAR_TSP650_CORRECTION_PARAMS: TStarTSP650CorrectionParams = {
  operationType: 1,
  correctionType: 0,
  correctionName: 'Акт коррекции',
  correctionNum: '1144',
  correctionDate: [20, 11, 12],
  taxSum: [16.67],
  emoney: 100,
  // cash: 100, <- Optional
};

export { STAR_TSP650_CORRECTION_PARAMS };
