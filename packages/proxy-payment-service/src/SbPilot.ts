/* eslint-disable quote-props */

import { spawn } from 'child_process';
// @ts-ignore No types for 'ping'
import { promise as ping } from 'ping';
import { writeConfigFile } from '@winstrike/admin-desktop-common-node';

import { SbPilotVersion } from './typings/sb-pilot';
import { ITerminalDriver } from './TerminalDriver';
import { stdoToConsole, inTestEnvironment } from './helpers';
import { ISbPilotOperationStatusChecker, OperationStatus } from './SbPilotOperationStatusChecker';
import HumanizedError from './HumanizedError';

interface SbPilotSendCommand {
  (operationType: keyof typeof OPERATION_TYPE, args: Array<string | number>): Promise<OperationStatus & {
    code: string;
    message: string; 
  }>;
}

type Props = {
  address: string;
  operationStatusChecker: ISbPilotOperationStatusChecker;
  sbPilotVersion: SbPilotVersion;
};

const OPERATION_TYPE = {
  pay: 1,
  refund: 3,
  'verificate-results': 7,
  cancel: 8,
  readConfig: 10,
} as const;

const ERROR_MESSAGE = {
  '2000':  'Отмена операции',
} as const;

class SbPilot implements ITerminalDriver {
  constructor ({ address, operationStatusChecker, sbPilotVersion }: Props) {
    this.isInited = false;
    this.address = address;
    this.operationStatusChecker = operationStatusChecker;
    this.sbPilotDirectory = `${process.cwd()}/sb-pilot/${sbPilotVersion}`;
    if (inTestEnvironment()) this.sendCommand = SbPilot.sendCommandTest.bind(this);
  }

  static withPing = true;
  static withUpdateConfig = true;
  static sendCommandTest: SbPilotSendCommand;
  isInited: boolean;
  address: string;
  private operationStatusChecker: ISbPilotOperationStatusChecker;
  private sbPilotDirectory: string;

  async init () {
    if (SbPilot.withPing) await this.pingTerminal();
    if (SbPilot.withUpdateConfig) await this.updateConfig();
    await this.checkTerminalConnection();
    this.isInited = true;
  }

  private async pingTerminal () {
    const result = await ping.probe(this.address);
    if (!result.alive) throw new Error('Терминал не обнаружен на указанном IP-адресе');
  }

  private async checkTerminalConnection () {
    const { code } = await this.sendCommand('readConfig', [40726]);

    if (code !== '0') throw new Error('Терминал не обнаружен на указанном IP-адресе');
  }

  private async updateConfig () {
    const path = `${this.sbPilotDirectory}/pinpad.ini`;
    await writeConfigFile(path, {
      PinpadIPAddr: this.address,
      PinpadIPPort: '8888',
    });
  }

  async pay (amount: number) {
    const { code, referenceNumber } = await this.sendCommand('pay', [amount * 100]);

    SbPilot.checkResponseCode(code);

    return referenceNumber;
  }

  async refund (invoiceId: string, amount: number) {
    const { code } = await this.sendCommand('refund', [amount * 100, 0, 'QSELECT', invoiceId]);

    SbPilot.checkResponseCode(code);
  }

  async cancel (invoiceId: string, amount: number) {
    const { code } = await this.sendCommand('cancel', [amount * 100, 0, 'QSELECT', invoiceId]);

    SbPilot.checkResponseCode(code);
  }

  async verificateResults () {
    const { code } = await this.sendCommand('verificate-results');

    SbPilot.checkResponseCode(code);
  }

  private async sendCommand (operationType: keyof typeof OPERATION_TYPE, args: Array<string | number> = []) {
    const sbPilotProcess = spawn(
      `${this.sbPilotDirectory}/sb_pilot`,
      [OPERATION_TYPE[operationType].toString(), ...args.map(arg => arg.toString())],
      { detached: true },
    );

    stdoToConsole(sbPilotProcess.stdout, sbPilotProcess.stderr);

    process.on('exit', () => {
      try {
        process.kill(sbPilotProcess.pid);
      } catch (e) {
        if (e.code === 'ESRCH') return;
        console.error(e);
      }
    });

    const operationStatus = await this.operationStatusChecker.operationStatus;
    const [, code, message] = /(.+),(.+)/.exec(operationStatus.codeAndMessage) || [];

    return { code, message, ...operationStatus };
  }

  private static checkResponseCode (code?: string) {
    if (!code) throw new HumanizedError('[Терминал] Терминал не отвечает');
    if (code !== '0') {
      const humanizedMessage: string | undefined = ERROR_MESSAGE[code as keyof typeof ERROR_MESSAGE];
      throw new HumanizedError(
        `[Терминал] ${humanizedMessage || 'Неизвестная ошибка'}`,
        `Terminal returned error '${code}'`,
      );
    }
  }
}

export default SbPilot;
