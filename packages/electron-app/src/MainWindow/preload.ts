// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { ipcRenderer, contextBridge } from 'electron';
import * as remote from '@electron/remote';

contextBridge.exposeInMainWorld('adminDesktop', {
  config: remote.getGlobal('config'),
  state: remote.getGlobal('state'),
  errors: remote.getGlobal('errors'),
  ipcRenderer: {
    on: (...args) => {
      ipcRenderer.on(...args);
    },
    removeListener: (...args) => {
      ipcRenderer.removeListener(...args);
    },
    send: (...args) => {
      ipcRenderer.send(...args);
    },
  },
} as TAdminDesktop);
