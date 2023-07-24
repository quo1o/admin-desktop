import fs from 'fs';
import lineReader from 'line-reader';
import iconv from 'iconv-lite';

import { ArrayElementType } from './typings/utils';
import { SbPilotVersion } from './typings/sb-pilot';

interface ISbPilotOperationStatusChecker {
  readonly operationStatus: Promise<OperationStatus>;
}

type OperationStatus = {
  [key in ArrayElementType<typeof LINES>]: string;
};

type Props = {
  sbPilotVersion: SbPilotVersion;
  readIntervalMs?: number;
};

const LINES = [
  'codeAndMessage',
  'cardNumberMasked',
  'expirationDate',
  'authorizationCode',
  'numberInner',
  'cardType',
  'sberbankSign',
  'terminalNumber',
  'dateTime',
  'referenceNumber',
  'cardNumberHash',
  'track3',
  'spasiboAmount',
  'merchantNumber',
  'monitoringMessageType',
  'gpcState',
  'monitoringMessage',
  'loyalityProgramNumber',
  'userResponseFor49',
  'id',
  'mask',
  'mifareLoyalityNumber',
  'vasEnabled',
] as const;

class SbPilotOperationStatusChecker implements ISbPilotOperationStatusChecker {
  constructor ({
    sbPilotVersion,
    readIntervalMs = 1000,
  }: Props) {
    this.eFilePath = `${process.cwd()}/sb-pilot/${sbPilotVersion}/e`;
    this.readIntervalMs = readIntervalMs;
  }

  private eFilePath: string;
  private readIntervalMs: number;
  get operationStatus () {
    return this.readEFile();
  }

  private async readEFile (): Promise<OperationStatus> {
    try {
      const operationStatus = await this.scheduleReadLines();
      return operationStatus;
    } catch (e) {
      if (e.code === 'ENOENT') return this.readEFile();
      throw e;
    }
  }

  private scheduleReadLines () {
    return new Promise<OperationStatus>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        this.readLines().then(resolve, reject);
      }, this.readIntervalMs);
    });
  }

  private readLines () {
    const operationStatus = {} as OperationStatus;

    return new Promise<OperationStatus>((resolve, reject) => {
      const onEnd = (err?: Error) => {
        if (err) {
          return reject(err);
        }
        fs.unlink(this.eFilePath, (err) => {
          if (err) reject(err);
          resolve(operationStatus);
        });
      };
  
      let index = 0;
      lineReader.eachLine(this.eFilePath, (line) => {
        const lineType = LINES[index];
        const decodedLine = iconv.decode(Buffer.from(line), 'cp866');
        const encodedLine = iconv.encode(decodedLine, 'utf-8');
        operationStatus[lineType] = encodedLine.toString();
        index++;
      }, onEnd);
    });
  }
}

export { ISbPilotOperationStatusChecker, OperationStatus };
export default SbPilotOperationStatusChecker;
