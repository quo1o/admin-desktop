import { IDB } from '../../db/DB';

class DBMock<Schema> implements IDB<Schema> {
  constructor (defaults: Schema) {
    this.db = defaults;
  }

  readonly db: Schema;

  init () {
    return Promise.resolve();
  }

  set (...[key, value]: Parameters<IDB<Schema>['set']>) {
    this.db[key] = value;
    return Promise.resolve();
  }

  get (...[key]: Parameters<IDB<Schema>['get']>) {
    return Promise.resolve(this.db[key]);
  }
}

export default DBMock;
