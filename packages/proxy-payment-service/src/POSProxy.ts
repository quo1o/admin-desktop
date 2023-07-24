import { spawn } from 'child_process';
// @ts-ignore No types for 'ping'
import { promise as ping } from 'ping';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { TCurrency } from '@winstrike/pps-typings/terminal';

import { TPosProxyPay } from './typings/terminal';
import healthcheck from './helpers/healthcheck';
import { stdoToConsole } from './helpers';
import HumanizedError from './HumanizedError';
import { ITerminalDriver } from './TerminalDriver';

type TProps = {
  address: string;
};

const PAY_ERROR_MESSAGE = {
  ER3:  'Отмена операции или внутренняя ошибка',
  ER:   'Внутренняя ошибка',
  '-1': 'Внутренняя ошибка',
  57:   'Карта клиента имеет статус «потеряна» или «украдена»',
  59:   'Карта клиента имеет ограниченные возможности',
  68:   'Ошибка банка (отказ от эмитента)',
} as const;

class POSProxy implements ITerminalDriver {
  constructor ({ address }: TProps) {

    this.address = address;
    this.apiKey = nanoid();
    this.isInited = false;
  }

  static baseUrl = 'http://localhost:8081/pos-proxy';
  static withPing = true;
  address: string;
  apiKey: string;
  isInited: boolean;

  async init () {
    if (POSProxy.withPing) await this.pingTerminal();
    await this.startProcess();
    this.isInited = true;
  }

  private async pingTerminal () {
    const result = await ping.probe(this.address);
    if (!result.alive) throw new Error('Терминал не обнаружен на указанном IP-адресе');
  }

  private async startProcess () {
    const posProxyProcess = spawn('java', ['-jar', `${process.cwd()}/pos-proxy/pos-proxy.jar`], {
      env: {
        HTTP_SERVER_ADDRESS: 'localhost',
        API_KEY: this.apiKey,
      },
      detached: true,
    });

    stdoToConsole(posProxyProcess.stdout, posProxyProcess.stderr);

    process.on('exit', () => {
      process.kill(posProxyProcess.pid);
    });

    return healthcheck({
      url: `${POSProxy.baseUrl}/pay`,
      errorMessage: 'POS Proxy не инициализирован',
      checkResult: (result) => result.status === 403 && result.data === 'Wrong X-API-Key',
    });
  }

  async pay (amount: number, currency: TCurrency) {
    if (!this.isInited) throw new Error('POS Proxy не запущен');

    const { data: { orderId, responseCode } } = await axios.post<TPosProxyPay>(
      `${POSProxy.baseUrl}/pay`,
      {
        amount: amount.toString(),
        currency,
        posType: 'INPAS',
        posAddress: `${this.address}:27015`,
      },
      {
        headers: { 'X-API-Key': this.apiKey },
        timeout: 175000,
      },
    );

    if (responseCode !== '00') {
      const humanizedMessage: string | undefined = PAY_ERROR_MESSAGE[responseCode as keyof typeof PAY_ERROR_MESSAGE];
      throw new HumanizedError(
        `[Терминал] ${humanizedMessage || 'Неизвестная ошибка'}`,
        `Terminal returned error '${responseCode}'`,
      );
    } else {
      return orderId.toString();
    }
  }

  refund () {
    return Promise.reject(new Error('POS Proxy doesn\'t support refund'));
  }

  cancel () {
    return Promise.reject(new Error('POS Proxy doesn\'t support cancel'));
  }

  verificateResults () {
    return Promise.reject(new Error('POS Proxy doesn\'t support results verification'));
  }
}

export { PAY_ERROR_MESSAGE };
export default POSProxy;
