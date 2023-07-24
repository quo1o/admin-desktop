import PAXSP30Driver from './PAXSP30Driver';

const terminalDriverByModel = {
  PAXSP30: PAXSP30Driver,
};

type TerminalModel = keyof typeof terminalDriverByModel;

export { TerminalModel };
export default terminalDriverByModel;
