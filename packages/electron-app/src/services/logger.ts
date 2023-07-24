import log from 'electron-log';

import { electronLogToLoki } from './loki';

function initLogger () {
  const logger = log.create('main');

  Object.assign(console, logger.functions);
  logger.transports.file.level = 'debug';
  logger.transports.file.fileName = 'admin-desktop.log';
  logger.transports.file.maxSize = 31457280;
  logger.transports.console.level = 'debug';

  logger.transports.loki = electronLogToLoki;
  logger.transports.loki.level = 'info';
}

export { initLogger };
