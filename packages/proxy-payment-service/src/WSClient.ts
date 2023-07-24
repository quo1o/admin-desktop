import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { promisify } from 'util';
import type { TServerMessage, TClientMessage } from '@winstrike/pps-typings/ws-client';

import { log } from './logger';
import { reportError } from './error-reporter';
import { IWSClientMessageHandler } from './WSClientMessageHandler';

type Props = {
  psUrl: string;
  ppsId: string;
  messageHandler: IWSClientMessageHandler;
};

type WebSocketWithHealthcheck = WebSocket & { isAlive?: boolean };

const RECONNECT_WAIT_MS = 10000;
const MAX_RECONNECT_ATTEMPT_COUNT = 10;
const HEALTHCHECK_INTERVAL_MS = 10000;

enum READY_STATE {
  CONNECTING = 0, // The connection is not yet open.
  OPEN	= 1,	    // The connection is open and ready to communicate.
  CLOSING = 2,	  // The connection is in the process of closing.
  CLOSED = 3,     // The connection is closed.
}

interface IWSClient {
  readonly isFree: Promise<void>;

  start (): Promise<void>;
  stop (): Promise<void>;

  // Connecting/connected event
  on(event: 'connecting' | 'connected', listener: () => void): this;
  once(event: 'connecting' | 'connected', listener: () => void): this;
  addListener(event: 'connecting' | 'connected', listener: () => void): this;
  removeListener(event: 'connecting' | 'connected', listener: () => void): this;
  emit(event: 'connecting' | 'connected'): boolean;

  // Connection error event
  on(event: 'error', listener: (error: Error) => void): IWSClient;
  once(event: 'error', listener: (error: Error) => void): IWSClient;
  addListener(event: 'error', listener: (error: Error) => void): IWSClient;
  removeListener(event: 'error', listener: (error: Error) => void): IWSClient;
}

// Declare strict event interface
declare interface WSClient {
  // Connecting/connected event
  on(event: 'connecting' | 'connected', listener: () => void): this;
  once(event: 'connecting' | 'connected', listener: () => void): this;
  addListener(event: 'connecting' | 'connected', listener: () => void): this;
  removeListener(event: 'connecting' | 'connected', listener: () => void): this;
  emit(event: 'connecting' | 'connected'): boolean;

  // Connection error event
  on(event: 'error', listener: (error: Error) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  addListener(event: 'error', listener: (error: Error) => void): this;
  removeListener(event: 'error', listener: (error: Error) => void): this;
  emit(event: 'error', error: Error): boolean;
}

class WSClient extends EventEmitter implements IWSClient {
  constructor ({ psUrl, ppsId, messageHandler }: Props) {
    super();

    this.psUrl = psUrl;
    this.ppsId = ppsId;
    this.isStopping = false;
    this.isFree = new Promise((resolve) => resolve());
    this.isFreeResolver = () => {};
    this.messageHandler = messageHandler;
    this.client = null;
    this.reconnectAttemptCount = 0;
  }

  public isFree: Promise<void>;
  private psUrl: string;
  private ppsId: string;
  private isStopping: boolean;
  private isFreeResolver: () => void;
  private messageHandler: IWSClientMessageHandler;
  private client: WebSocket | null;
  private reconnectAttemptCount: number;

  async start () {
    await this.messageHandler.init();
    await this.connect();
  }

  private connect () {
    this.emit('connecting');
    log('info', `[WS] Connecting to ${this.psUrl}`);

    this.client = new WebSocket(this.psUrl, { handshakeTimeout: 30000 });

    healthcheckConnection(this.client);

    return new Promise((resolve, reject) => {
      this.client?.on('error', (error: Error) => {
        log('error', '[WS] Error', error);
      });

      this.client?.on('close', (code, reason) => {
        if (this.isStopping) return;

        const error = new Error(`${code}: connection closed${reason ? ` with reason '${reason}'` : ''}`);
        log('error', '[WS] Closed', error);
        this.reconnect(error).then(resolve).catch(reject);
      });
    
      this.client?.on('open', () => {
        log('info', '[WS] Connected');

        this.client?.on('message', (data) => {
          this.receiveMessage(data).catch(e => reportError(e, '[WS]'));
        });

        this.sendMessage({ type: 'init', body: { ppsId: this.ppsId } })
          .then(() => {
            this.reconnectAttemptCount = 0;
            this.emit('connected');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  private reconnect (error: Error) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
  
        if (this.reconnectAttemptCount !== MAX_RECONNECT_ATTEMPT_COUNT) {
          this.reconnectAttemptCount += 1;
          this.connect().then(resolve).catch(reject);
        } else {
          this.emit('error', error);
          reject(error);
        }
      }, RECONNECT_WAIT_MS);
    });
  }

  private setIsInProgress (value: boolean) {
    if (value) {
      this.isFree = new Promise((resolve) => {
        this.isFreeResolver = resolve;
      });
    } else {
      this.isFreeResolver();
    }
  }

  private async sendMessage (message: TClientMessage) {
    if (this.client && this.client.readyState === READY_STATE.OPEN) {
      await promisify(this.client.send.bind(this.client))(JSON.stringify(message));
      log('info', '[WS] Message sent', JSON.stringify(message));
    }
  }

  private async receiveMessage (rawData: WebSocket.Data) {
    if (this.isStopping) {
      await this.sendMessage({ type: 'error', body: { message: 'PPS is stopping' } });
      return;
    }

    this.setIsInProgress(true);

    if (typeof rawData !== 'string') throw new Error('Invalid WS message data type');

    const data: TServerMessage = JSON.parse(rawData);
    log('info', '[WS] Message received', JSON.stringify(data));

    const clientMessage = await this.messageHandler.handleMessage(data);
    await this.sendMessage(clientMessage);
    
    this.setIsInProgress(false);
  }

  async stop () {
    this.isStopping = true;
    await this.isFree;
    this.client?.close();
  }
}

function healthcheckConnection (client: WebSocket) {
  client.on('open', function healthcheck (this: WebSocketWithHealthcheck) {
    this.isAlive = true;
    this.on('pong', function heartbeat (this: WebSocketWithHealthcheck) {
      this.isAlive = true;
    });

    const interval = setInterval(() => {
      if (this.isAlive === false) {
        log('error', '[WS] Terminated by healthcheck');
        this.terminate();
      }
      this.isAlive = false;
      this.ping();
    }, HEALTHCHECK_INTERVAL_MS);
  
    this.on('close', () => {
      clearInterval(interval);
    });
  });
}

export { Props, IWSClient };
export default WSClient;
