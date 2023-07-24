import { dialog } from 'electron';
import { readFile as readFileWithCallback } from 'fs';
import { promisify } from 'util';
import path from 'path';
import yaml from 'yaml';

const NO_PPS_ERROR_MESSAGE = 'Касса Winstrike работает в режиме без интеграции с ККТ! ' +
  'Пожалуйста, выполните данную операцию непосредственно на вашей ККТ';

const readFile = promisify(readFileWithCallback);

function runIfPpsStarted <T extends []> (action: CallableFunction, ...args: T) {
  if (global.state.isPpsStarted) action(...args);
  else if (global.config.MODE === 'without-kkt-integration') {
    dialog.showErrorBox('Операция невозможна', NO_PPS_ERROR_MESSAGE);
  }
}

async function readReleaseNotes (): Promise<ReleaseNotes> {
  const releaseNotes = await readFile(path.join(process.cwd(), 'release-notes.yml'), 'utf-8');
  return yaml.parse(releaseNotes);
}

export { NO_PPS_ERROR_MESSAGE, runIfPpsStarted, readReleaseNotes };
