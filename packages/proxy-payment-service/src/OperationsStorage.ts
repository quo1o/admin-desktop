import { isAfter, subDays } from 'date-fns';
import { TServerMessageType, TClientMessageBody } from '@winstrike/pps-typings/ws-client';

import { IDB } from './db/DB';
import { OperationsDBSchema, Operation } from './db/OperationsDB';

interface IOperationsStorage {
  init (): Promise<void>;
  add (params: SaveParams): Promise<void>;
  /**
   * If operation already exists - returns operation.
   * If doesn't - returns void.
   */
  addUnique (params: SaveParams): Promise<Operation | void>;
  update (params: SaveParams): Promise<void>;
  get (type: TServerMessageType, id: string): Promise<Operation>;
}

type Props = {
  db: IDB<OperationsDBSchema>;
};

type SaveParams = {
  id: string;
  type: TServerMessageType;
  status: 'pending' | 'success' | 'error';
  body?: TClientMessageBody;
};

class OperationsStorage implements IOperationsStorage {
  constructor ({ db }: Props) {
    this.db = db;
  }

  private db: IDB<OperationsDBSchema>;

  async init () {
    await this.db.init();
    await this.removeOld();
  }

  private async removeOld () {
    const operations = await this.db.get('operations');

    const onlyNewOperations = operations.filter(({ createdAt }) => isAfter(createdAt, subDays(new Date(), 7)) );

    await this.db.set('operations', onlyNewOperations);
  }

  async add ({ id, type, status, body }: SaveParams) {
    const operations = await this.readOperations();
    operations.push({ id, type, status, body, createdAt: new Date().getTime() });

    await this.db.set('operations', operations);
  }

  async update ({ id, type, status, body }: SaveParams) {
    const operations = await this.readOperations();
    const index = operations.findIndex(op => op.id === id && op.type === type);

    if (index === -1) throw new Error(`Operation '${id}' not found`);

    operations[index] = {
      ...operations[index],
      status,
      ...(body && { body }),
    };

    await this.db.set('operations', operations);
  }

  async addUnique ({ id, type, status, body }: SaveParams) {
    const operations = await this.readOperations();
    const operation = operations.find(op => op.id === id && op.type === type);

    if (operation) return operation;

    operations.push({ id, type, status, body, createdAt: new Date().getTime() });

    await this.db.set('operations', operations);
  }

  async get (type: TServerMessageType, id: string) {
    const operations = await this.readOperations();
    const operation = operations.find(op => op.id === id && op.type === type);

    if (!operation) throw new Error(`Operation '${id}' not found`);

    return operation;
  }

  private async readOperations () {
    const operations = await this.db.get('operations');

    return operations;
  }
}

export { IOperationsStorage };
export default OperationsStorage;
