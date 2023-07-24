import type { IpcRendererEvent } from 'electron';
import getGlobal from './get-global';
import { TConfig } from '@winstrike/pps-typings/printer';

const CASH_BOX_OPERATION_CHANNEL_NAME = 'main:cash-box-action';
const CONFIG_CHANNEL_NAME = 'main:configure-kkm';

const { ipcRenderer } = getGlobal();

function sendCashBoxAction (params: TCashBoxActionParams): Promise<void> {
  ipcRenderer.send(CASH_BOX_OPERATION_CHANNEL_NAME, JSON.stringify(params));

  return new Promise((resolve, reject) => {
    const onResponse = (_: IpcRendererEvent, error?: string) => {
      ipcRenderer.removeListener(CASH_BOX_OPERATION_CHANNEL_NAME, onResponse);

      if (error) reject(error);
      else resolve();
    };

    ipcRenderer.on(CASH_BOX_OPERATION_CHANNEL_NAME, onResponse);
  });
}

function sendConfig (config: TConfig): Promise<void> {
  ipcRenderer.send(CONFIG_CHANNEL_NAME, JSON.stringify(config));

  return new Promise((resolve, reject) => {
    const onResponse = (_: IpcRendererEvent, error?: string) => {
      ipcRenderer.removeListener(CONFIG_CHANNEL_NAME, onResponse);

      if (error) reject(error);
      else resolve();
    };

    ipcRenderer.on(CONFIG_CHANNEL_NAME, onResponse);
  });
}

export { sendCashBoxAction, sendConfig };
