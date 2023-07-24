import FileAsync from 'lowdb/adapters/FileAsync';

import DB, { DB_DIRECTORY } from './DB';

type MoySkladDBSchema = {
  syncId?: string;
  shiftNumber?: string;
  withdrawNumber?: string;
  depositNumber?: string;
  saleNumber?: string;
  refundNumber?: string;
};

const DB_FILE_NAME = 'moy_sklad.db.json';
const DB_PATH = process.env.ENV === 'development'
  ? DB_FILE_NAME
  : `${DB_DIRECTORY}/${DB_FILE_NAME}`;

class MoySkladDB extends DB<MoySkladDBSchema> {
  constructor () {
    super({ adapter: new FileAsync(DB_PATH) });
  }
}

export { MoySkladDBSchema };
export default MoySkladDB;
