import FileAsync from 'lowdb/adapters/FileAsync';
import { TClientMessageBody, TServerMessageType } from '@winstrike/pps-typings/ws-client';

import DB, { DB_DIRECTORY } from './DB';

type Status = 'pending' | 'success' | 'error';

type Operation = {
  id: string;
  status: Status;
  type: TServerMessageType;
  createdAt: number;
  body?: TClientMessageBody;
};

type OperationsDBSchema = {
  operations: Operation[];
};

const DB_FILE_NAME = 'operations.db.json';
const DB_PATH = process.env.ENV === 'development'
  ? DB_FILE_NAME
  : `${DB_DIRECTORY}/${DB_FILE_NAME}`;

class OperationsDB extends DB<OperationsDBSchema> {
  constructor () {
    super({
      adapter: new FileAsync(DB_PATH),
      defaults: { operations: [] },
    });
  }
}

export { OperationsDBSchema, Operation, Status };
export default OperationsDB;
