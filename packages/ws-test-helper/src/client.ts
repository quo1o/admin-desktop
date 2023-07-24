import WebSocket from 'ws';
import { promisify } from 'util';

import Queue from './queue';
import { IWSMessageQueue } from './matchers';

class WSClient implements IWSMessageQueue {
  constructor (url: string) {
    WSClient.instances.push(this);

    let resolveConnection: () => void;
    let resolveClose: () => void;

    this.connected = new Promise((resolve) => (resolveConnection = resolve));
    this.closed = new Promise((resolve) => (resolveClose = resolve));
    this.messages = [];
    this.messagesToConsume = new Queue();

    this.client = new WebSocket(url);

    this.client.on('close', () => {
      resolveClose();
    });

    this.client.on('open', () => {

      resolveConnection();

      this.client.on('message', (message) => {
        this.messages.push(message);
        this.messagesToConsume.put(message);
      });
    });
  }

  private static instances: WSClient[] = [];
  connected: Promise<void>;
  closed: Promise<void>;
  messages: WebSocket.Data[];
  private messagesToConsume: Queue<WebSocket.Data>;
  private client: WebSocket;

  static clean () {
    for (const instance of WSClient.instances) {
      instance.close();
      instance.messages = [];
    }
    WSClient.instances = [];
  }

  waitNextMessage () {
    return this.messagesToConsume.get();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send <T extends Record<string, any>>(message: T) {
    const sendToClient = promisify(this.client.send.bind(this.client));
    return sendToClient(JSON.stringify(message));
  }

  error () {
    this.client.emit('error');
    this.client.close();
  }

  close () {
    this.client.close();
  }
}

export default WSClient;
