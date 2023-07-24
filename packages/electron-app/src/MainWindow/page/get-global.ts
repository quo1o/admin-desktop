const { adminDesktop: { config, state, errors, ipcRenderer } } = window;

export default function getGlobal () {
  if (!config || !state || !errors || !ipcRenderer) {
    throw new Error('This app can\'t run without some data of the main process');
  }
  return { config, state, errors, ipcRenderer };
}
