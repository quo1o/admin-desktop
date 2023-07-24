import WebSocket from 'ws';
import { promisify } from 'util';

import Queue from './queue';
import { IWSMessageQueue } from './matchers';

class WSServer implements IWSMessageQueue {
  constructor (url: string) {
    WSServer.instances.push(this);

    let resolveListening: () => void;
    let resolveConnection: (ws: WebSocket) => void;
    let resolveClose: () => void;

    this.listening = new Promise((resolve) => (resolveListening = resolve));
    this.connected = new Promise((resolve) => (resolveConnection = resolve));
    this.closed = new Promise((resolve) => (resolveClose = resolve));
    this.messages = [];
    this.messagesToConsume = new Queue();

    const { hostname: host, port } = new URL(url);
    this.server = new WebSocket.Server({ host, port: parseInt(port, 10) });

    this.server.on('listening', () => {
      resolveListening();
    });

    this.server.on('close', () => {
      resolveClose();
    });

    this.server.on('connection', (ws) => {

      resolveConnection(ws);

      ws.on('message', (message) => {
        this.messages.push(message);
        this.messagesToConsume.put(message);
      });
    });
  }

  private static instances: WSServer[] = [];
  listening: Promise<void>;
  connected: Promise<WebSocket>;
  closed: Promise<void>;
  messages: WebSocket.Data[];
  private messagesToConsume: Queue<WebSocket.Data>;
  private server: WebSocket.Server;

  static async clean () {
    for (const instance of WSServer.instances) {
      await instance.close();
      instance.messages = [];
    }
    WSServer.instances = [];
  }

  waitNextMessage () {
    return this.messagesToConsume.get();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send <T extends Record<string, any>>(message: T) {
    const promises: Array<Promise<void>> = [];

    for (const client of this.server.clients) {
      const sendToClient = promisify(client.send.bind(client));
      promises.push(sendToClient(JSON.stringify(message)));
    }

    return Promise.all(promises);
  }

  error () {
    this.server.emit('error');
    this.server.close();
  }

  close () {
    return promisify(this.server.close.bind(this.server))();
  }
}

export default WSServer;
