import lowdb, { AdapterAsync } from 'lowdb';

interface IDB<Schema> {
  init (): Promise<void>;
  set (key: keyof Schema, value: Schema[typeof key]): Promise<void>;
  get (key: keyof Schema): Promise<Schema[typeof key]>;
}

type Props<Schema> = {
  adapter: AdapterAsync<Schema>;
  defaults?: Schema;
};

const DB_DIRECTORY = 'C:/Users/Default/AppData/Roaming/admin-desktop/db';

class DB<Schema> implements IDB<Schema> {
  constructor ({ adapter, defaults }: Props<Schema>) {
    this.adapter = adapter;
    this.defaults = defaults;
  }

  private adapter: AdapterAsync<Schema>;
  protected lowdb?: lowdb.LowdbAsync<Schema>;
  protected defaults?: Schema;

  async init () {
    this.lowdb = await lowdb(this.adapter);
    if (this.defaults) await this.lowdb.defaults(this.defaults).write();
  }

  async set (key: keyof Schema, value: Schema[typeof key]) {
    await this.lowdb?.set(key, value).write();
  }

  async get (key: keyof Schema) {
    await this.lowdb?.read();
    return this.lowdb?.get(key).value() as Schema[typeof key];
  }
}

export { IDB, DB_DIRECTORY };
export default DB;
