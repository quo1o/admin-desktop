/* eslint-disable no-console */

import { autoUpdater, AppUpdater, UpdateDownloadedEvent } from 'electron-updater';
import log, { ElectronLog } from 'electron-log';
import retryPromise from 'promise-retry';

import { reportError } from './error-reporter';

type TAppUpdaterWithLogger = AppUpdater & { logger: ElectronLog | null };

const CHECK_FOR_UPDATES_INTERVAL_MS = 600000;

const autoUpdaterWithLogger = autoUpdater as TAppUpdaterWithLogger;

const logger = log.create('update-manager');

autoUpdaterWithLogger.logger = logger;
autoUpdaterWithLogger.logger.transports.file.level = 'info';
autoUpdaterWithLogger.logger.transports.file.fileName = 'update-manager.log';

function checkForUpdates (onUpdateDownloaded?: (info: UpdateDownloadedEvent) => void) {
  if (onUpdateDownloaded) autoUpdaterWithLogger.signals.updateDownloaded(onUpdateDownloaded);

  retryPromise(async (retry) => {
    const update = await autoUpdaterWithLogger.checkForUpdates().catch(reportAutoupdaterError) || null;

    if (!update?.downloadPromise) return retry('No update available');

    const isDownloaded = Boolean(await update.downloadPromise.catch(reportAutoupdaterError) || null);

    if (!isDownloaded) return retry('Update downloading failed');
  }, {
    forever: true,
    factor: 1,
    minTimeout: CHECK_FOR_UPDATES_INTERVAL_MS,
    maxTimeout: CHECK_FOR_UPDATES_INTERVAL_MS,
  })
    .catch(reportAutoupdaterError);
}

function reportAutoupdaterError (e: Error) {
  return reportError(e, '[Autoupdater]');
}

export {
  checkForUpdates,
};
