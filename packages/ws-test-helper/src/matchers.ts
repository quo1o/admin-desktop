/* eslint-disable prefer-template */

import diff from 'jest-diff';
import WebSocket from 'ws';

interface IWSMessageQueue {
  waitNextMessage: () => Promise<WebSocket.Data>;
  messages: WebSocket.Data[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace, no-redeclare
  namespace jest {
    interface Matchers<R> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toReceiveMessage<T extends Record<string, any>>(message: T): Promise<R>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toHaveReceivedMessages<T extends Record<string, any>>(messages: Array<T>): R;
    }
  }
}

const WAIT_DELAY = 5000;
const TIMEOUT = Symbol('timeout');

const makeInvalidWsMessage = function makeInvalidWsMessage (
  this: jest.MatcherUtils,
  messageQueue: IWSMessageQueue,
  matcher: string,
) {
  return (
    this.utils.matcherHint(
      this.isNot ? `.not.${matcher}` : `.${matcher}`,
      'WS',
      'expected',
    ) +
    '\n\n' +
    // eslint-disable-next-line max-len
    'Expected the WS server/client object to be a valid IWSMessageQueue implementation with props \'nextMessage\' and \'messages\'.\n' +
    `Received: ${typeof messageQueue}\n` +
    `  ${this.utils.printReceived(messageQueue)}`
  );
};

expect.extend({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async toReceiveMessage (messageQueue: IWSMessageQueue, expected: Record<string, any>) {
    if (!isWSMessageQueue(messageQueue)) {
      return {
        pass: this.isNot, // always fail
        message: makeInvalidWsMessage.bind(this, messageQueue, 'toReceiveMessage'),
      };
    }

    let timeout: NodeJS.Timeout | null = null;
    const messageOrTimeout = await Promise.race([
      messageQueue.waitNextMessage(),
      new Promise((resolve) => (timeout = setTimeout(() => resolve(TIMEOUT), WAIT_DELAY))),
    ]);

    if (timeout) clearTimeout(timeout);

    if (messageOrTimeout === TIMEOUT) {
      return {
        pass: this.isNot, // always fail
        message: () =>
          this.utils.matcherHint(
            this.isNot ? '.not.toReceiveMessage' : '.toReceiveMessage',
            'WS',
            'expected',
          ) +
          '\n\n' +
          'Expected the WS server/client to receive a message,\n' +
          `but it didn't receive anything in ${WAIT_DELAY}ms.`,
      };
    }

    // Parse received object
    const received = JSON.parse(messageOrTimeout as string);

    const pass = this.equals(received, expected);

    const message = pass
      ? () =>
          this.utils.matcherHint('.not.toReceiveMessage', 'WS', 'expected') +
          '\n\n' +
          'Expected the next received message to not equal:\n' +
          `  ${this.utils.printExpected(expected)}\n` +
          'Received:\n' +
          `  ${this.utils.printReceived(received)}`
      : () => {
          const diffString = diff(expected, received, { expand: this.expand });
          return (
            this.utils.matcherHint('.toReceiveMessage', 'WS', 'expected') +
            '\n\n' +
            'Expected the next received message to equal:\n' +
            `  ${this.utils.printExpected(expected)}\n` +
            'Received:\n' +
            `  ${this.utils.printReceived(received)}\n\n` +
            `Difference:\n\n${diffString}`
          );
        };

    return {
      actual: received,
      expected,
      message,
      name: 'toReceiveMessage',
      pass,
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toHaveReceivedMessages (messageQueue: IWSMessageQueue, messages: Array<Record<string, any>>) {
    if (!isWSMessageQueue(messageQueue)) {
      return {
        pass: this.isNot, // always fail
        message: makeInvalidWsMessage.bind(this, messageQueue, 'toHaveReceivedMessages'),
      };
    }

    const received = messages.map((expected) =>
      // Parse actual object
      messageQueue.messages.some((actual) => this.equals(JSON.parse(actual as string), expected)),
    );
    const pass = this.isNot ? received.some(Boolean) : received.every(Boolean);
    const message = pass
      ? () =>
          this.utils.matcherHint(
            '.not.toHaveReceivedMessages',
            'WS',
            'expected',
          ) +
          '\n\n' +
          'Expected the WS server/client to not have received the following messages:\n' +
          `  ${this.utils.printExpected(messages)}\n` +
          'But it received:\n' +
          `  ${this.utils.printReceived(messageQueue.messages)}`
      : () => {
          return (
            this.utils.matcherHint(
              '.toHaveReceivedMessages',
              'WS',
              'expected',
            ) +
            '\n\n' +
            'Expected the WS server/client to have received the following messages:\n' +
            `  ${this.utils.printExpected(messages)}\n` +
            'Received:\n' +
            `  ${this.utils.printReceived(messageQueue.messages)}\n\n`
          );
        };

    return {
      actual: messageQueue.messages,
      expected: messages,
      message,
      name: 'toHaveReceivedMessages',
      pass,
    };
  },
});

function isWSMessageQueue (instance: IWSMessageQueue): instance is IWSMessageQueue {
  return Array.isArray(instance.messages) && typeof instance.waitNextMessage === 'function';
}

export { IWSMessageQueue };
