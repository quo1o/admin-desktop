import StarTSP650Driver from './StarTSP650Driver';

const printerDriverByModel = {
  StarTSP650: StarTSP650Driver,
};

type PrinterModel = keyof typeof printerDriverByModel;

export { PrinterModel };
export default printerDriverByModel;
