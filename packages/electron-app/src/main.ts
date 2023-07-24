// Modules to control application life and create native browser window
import { app, Menu, Tray, ipcMain, dialog } from 'electron';
import { UpdateDownloadedEvent } from 'electron-updater';
import electronIsDev from 'electron-is-dev';
import path from 'path';
import { nanoid } from 'nanoid';
import yaml from 'yaml';
import { initialize as initRemote } from '@electron/remote/main';
import ProxyPaymentService, {
  isSupportedTerminalModel,
  isSupportedPrinterModel,
  isSupportedAcquiring,
} from '@winstrike/proxy-payment-service';
import { TConfig } from '@winstrike/pps-typings/printer';

import { readConfig, writeConfig } from './config';
import createObservableObject from './create-observable-object';
import MainWindow from './MainWindow';
import { checkForUpdates } from './services/update-manager';
import checkConfigRequiredFields from './helpers/check-config-required-fields';
import { initLogger } from './services/logger';
import { NO_PPS_ERROR_MESSAGE, readReleaseNotes } from './helpers';
import { initSentry, captureMessage, reportError } from './services/error-reporter';

const SERVER_ERROR_MESSAGE = 'Ошибка соединения с сервером, попробуйте перезапустить приложение';

const menuTemplate = [
  { label: 'X-отчет', click: () => onReportClick('X')},
  { label: 'Z-отчет', click: () => onReportClick('Z')},
  {
    label: 'Перезапустить', click: async () => {
      await gracefullyQuit(true);
    },
  },
  { label: 'Выход', click: async () => {
      await gracefullyQuit();
  } },
];

// Keep a global reference of the window objects, if you don't, windows will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: MainWindow | null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let tray: Tray;

let proxyPaymentService: ProxyPaymentService | null;

initRemote();
initApp();

function onReportClick (type: 'Z' | 'X') {
  const { window } = mainWindow || {};
  const options = {
    type: 'question',
    buttons: ['Да, распечатать', 'Нет'],
    cancelId: 1,
    title: 'Касса Winstrike',
    message: `Вы точно хотите распечатать ${type}-отчет?${type === 'Z' ? ' Будет закрыта текущая смена.' : ''}`,
  };

  const promise = window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options);
  promise.then(({ response }) => {
    if (response === 0) {
      if (!proxyPaymentService && global.config.MODE === 'without-kkt-integration') {
        throw new Error(NO_PPS_ERROR_MESSAGE);
      }
      return proxyPaymentService?.cashierActions[`print${type}Report` as 'printZReport' | 'printXReport']();
    }
    captureMessage('Misclick from some epileptic');
  })
    .catch((e) => {
      console.error(`[KKM ${type}-Report] ${e.message}`);
      dialog.showErrorBox(`${type}-Отчет`, e.humanizedMessage || e.message);
    });
}

async function gracefullyQuit (shouldRelaunch?: boolean) {
  global.state.ppsError = undefined;
  await proxyPaymentService?.stop()
    .catch(e => reportError(e, '[PPS Stop]'));
  if (shouldRelaunch) app.relaunch();
  app.quit();
}

function initApp () {
  app.commandLine.appendSwitch('disable-http-cache');
  const hasLock = app.requestSingleInstanceLock();

  if (hasLock) {
    app.on('second-instance', focusOrCreateNewWindow);
  } else {
    app.quit();
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', () => {
    startApp().catch((e) => {
      reportError(e);
      app.quit();
    });
  });

  // Prevent quit when all windows are closed.
  app.on('window-all-closed', () => {});

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) mainWindow = createMainWindow();
  });
}

async function startApp () {
  await initConfig();
  initSentry();
  await initReleaseNotes();
  if (!electronIsDev) initLogger();
  initState();

  tray = createTray();
  mainWindow = createMainWindow();
  if (global.config.MODE !== 'without-kkt-integration') proxyPaymentService = createPPS();

  if (!electronIsDev && global.config.AUTOUPDATE === 'true') checkForUpdates(onUpdateDownloaded);
}

async function initConfig () {
  const globalRequiredFields = [
    'PPS_ID',
    'BOOKING_ADMIN_URL',
    'BOOKING_API_URL',
    'WINSTRIKE_ID_URL',
    'PS_WS_URL',
    'PS_HTTP_URL',
  ] as const;
  let config: Partial<TGlobalConfig> = {};
  let rwError: Error | string | undefined;

  try {
    config = await readConfig();
  } catch (e) {
    console.error(e);
    rwError = e;
  }

  // Generate PPS ID if it doesn't exist
  if (!rwError && !config.PPS_ID) {
    const ppsId = nanoid();
    try {
      await writeConfig({ PPS_ID: ppsId });
    } catch (e) {
      console.error(e);
      rwError = e;
    }
    config.PPS_ID = ppsId;
  }

  global.errors = {};

  if (rwError) {
    global.errors.main = rwError instanceof Error ? rwError.message : rwError;
    return;
  }

  const requiredConfigOrError = checkConfigRequiredFields(config, globalRequiredFields);
  if (typeof requiredConfigOrError === 'string') {
    global.errors.main = requiredConfigOrError;
    global.config = config as TGlobalConfig;
  } else {
    global.config = { ...requiredConfigOrError, MODE: config.MODE || 'classic' };
  }
}

async function initReleaseNotes () {
  const releaseNotes = await readReleaseNotes();
  global.releaseNotes = releaseNotes;
}

function initState () {
  const initialState = {
    ppsLogMessage: 'Старт',
    isPpsStarted: false,
    isProductsModalOpen: false,
    isCashBoxModalOpen: false,
    isCorrectionModalOpen: false,
    ppsError: undefined,
    wsStatus: undefined,
  };
  (global as Mutable<NodeJS.Global>).state = createObservableObject(initialState, () => {
    mainWindow?.window?.webContents.send('main:state-changed', JSON.stringify(global.state));
  });
  ipcMain.on('main:update-state', (_, updatedStateJSON: string) => {
    Object.assign(global.state, JSON.parse(updatedStateJSON));
  });
}

function createTray () {
  const newTray = new Tray(path.join(process.cwd(), 'assets/icon.ico'));
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  newTray.setToolTip('Касса Winstrike');
  newTray.setContextMenu(contextMenu);
  newTray.on('click', focusOrCreateNewWindow);
  return newTray;
}

function focusOrCreateNewWindow () {
  if (mainWindow) {
    if (mainWindow.window?.isMinimized()) mainWindow.window?.restore();
    mainWindow.window?.focus();
  } else {
    mainWindow = createMainWindow();
  }
}

function createMainWindow () {
  const newMainWindow = new MainWindow({
    menuTemplate,
    pageUrl: global.config.DEV_SERVER_URL,
    isDevTools: global.config.DEV_TOOLS === 'true',
  });

  newMainWindow.window?.on('closed', function () {
    mainWindow = null;
  });

  return newMainWindow;
}

function createPPS () {
  const {
    MODE,
    PS_WS_URL,
    PPS_ID,
    TERMINAL_ACQUIRING = 'cassby',
    DISABLE_AUTO_CLOSE_SHIFT,
    DISABLE_PRINTER_HEALTHCHECK,
    TEST_MODE,
    MOY_SKLAD_URL,
    MOY_SKLAD_SALEPOINT_ID,
    MOY_SKLAD_LOGIN,
    MOY_SKLAD_PASSWORD,
    CHECKING_RESULT_RETRIES_COUNT,
  } = global.config;
  const commonOptions = {
    psUrl: PS_WS_URL,
    ppsId: PPS_ID,
  };
  let newPPS: ProxyPaymentService;

  if (MODE !== 'classic' && MODE !== 'kkm-server') {
    global.state.ppsError = 'Не указан параметр MODE';
    return null;
  }

  if (MODE === 'classic') {
    const requiredConfigOrError = checkConfigRequiredFields(
      global.config,
      ['TERMINAL_MODEL', 'TERMINAL_ADDRESS', 'PRINTER_MODEL', 'PRINTER_ADDRESS'] as const,
    );
    if (typeof requiredConfigOrError === 'string') {
      global.state.ppsError = requiredConfigOrError;
      return null;
    }

    if (!isSupportedTerminalModel(requiredConfigOrError.TERMINAL_MODEL)) {
      global.state.ppsError = 'Неподдерживаемая модель терминала, проверьте название модели';
      // TODO: throw error
      return null;
    }
    if (!isSupportedPrinterModel(requiredConfigOrError.PRINTER_MODEL)) {
      global.state.ppsError = 'Неподдерживаемая модель принтера, проверьте название модели';
      // TODO: throw error
      return null;
    }
    if (!isSupportedAcquiring(TERMINAL_ACQUIRING)) {
      global.state.ppsError = 'Неподдерживаемый тип эквайринга, проверьте название типа';
      // TODO: throw error
      return null;
    }

    let moySkladParams;
    if (MOY_SKLAD_URL && MOY_SKLAD_SALEPOINT_ID && MOY_SKLAD_PASSWORD && MOY_SKLAD_LOGIN) {
      moySkladParams = {
        url: MOY_SKLAD_URL,
        salePointId: MOY_SKLAD_SALEPOINT_ID,
        login: MOY_SKLAD_LOGIN,
        password: MOY_SKLAD_PASSWORD,
      };
    }

    newPPS = new ProxyPaymentService(MODE, {
      ...commonOptions,
      terminal: {
        model: requiredConfigOrError.TERMINAL_MODEL,
        address: requiredConfigOrError.TERMINAL_ADDRESS,
        acquiring: TERMINAL_ACQUIRING,
      },
      printer: {
        model: requiredConfigOrError.PRINTER_MODEL,
        address: requiredConfigOrError.PRINTER_ADDRESS,
        shouldAutoCloseShift: DISABLE_AUTO_CLOSE_SHIFT !== 'true',
        shouldHealthcheck: DISABLE_PRINTER_HEALTHCHECK !== 'true',
        shouldResetConfig: true,
        moySkladParams,
      },
      isTestMode: TEST_MODE === 'true',
    });
  } else {
    newPPS = new ProxyPaymentService(MODE, {
      ...commonOptions,
      checkingResultRetriesCount:
        (CHECKING_RESULT_RETRIES_COUNT && parseInt(CHECKING_RESULT_RETRIES_COUNT, 10)) || undefined,
    });
  }

  newPPS.on('log', (message: string) => {
    global.state.ppsLogMessage = message;
  });

  newPPS.on('started', () => {
    global.state.isPpsStarted = true;
  });
  newPPS.on('stopping', () => {
    global.state.isPpsStarted = false;
  });

  syncWsStatus(newPPS);

  newPPS.start().catch(onPPSError);
  newPPS.on('error', onPPSError);

  handleCashBoxActions();
  handleConfigureKKM();

  return newPPS;
}

function syncWsStatus (pps: ProxyPaymentService) {
  const statuses = ['connecting', 'connected'] as const;

  statuses.forEach((status) => {
    pps.on(status, () => {
      global.state.wsStatus = status;
    });
  });
}

function onPPSError (error: Error) {
  reportError(error);
  const errorAsString = error.toString().replace('Error: ', '');
  // TODO: receive humanized error messages from PPS
  global.state.ppsError = errorAsString.includes('connect')
    ? SERVER_ERROR_MESSAGE
    : error.message;
}

function handleCashBoxActions () {
  ipcMain.on('main:cash-box-action', (_, paramsJSON: string) => {
    const { type, amount }: TCashBoxActionParams = JSON.parse(paramsJSON);
    let error: Error & { humanizedMessage?: string } | void;

    if (!proxyPaymentService) {
      return mainWindow?.window?.webContents
        .send('main:cash-box-action', 'Интеграция с ККТ еще не инициализирована');
    }

    proxyPaymentService.cashierActions[`${type}Cash` as 'withdrawCash' | 'depositCash'](amount)
      .catch(e => (error = e))
      .finally(() => mainWindow?.window?.webContents
        .send('main:cash-box-action', error && (error.humanizedMessage || error.message)),
      );
  });
}

function handleConfigureKKM () {
  ipcMain.on('main:configure-kkm', (_, paramsJSON: string) => {
    const config: TConfig = JSON.parse(paramsJSON);
    let error: Error & { humanizedMessage?: string } | void;

    if (!proxyPaymentService) {
      return mainWindow?.window?.webContents
        .send('main:cash-box-action', 'Интеграция с ККТ еще не инициализирована');
    }

    proxyPaymentService.cashierActions.configure(config)
      .catch(e => (error = e))
      .finally(() => mainWindow?.window?.webContents
        .send('main:configure-kkm', error),
      );
  });
}

function onUpdateDownloaded (event: UpdateDownloadedEvent) {
  const { window } = mainWindow || {};
  const options = {
    type: 'info',
    buttons: ['Перезапустить'],
    title: 'Касса Winstrike',
    message: `Загружено обновление до версии ${event.version}`,
    detail: getDetail(event),
  };
  const showDialog = () => {
    const promise = window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options);
    promise.then(() => gracefullyQuit()).catch(reportError);
  };

  if (proxyPaymentService) proxyPaymentService.isFree.then(showDialog);
  else showDialog();
}

function getDetail ({ version, releaseNotes }: UpdateDownloadedEvent) {
  const infoText = 'Необходимо перезапустить приложение.\nОбязательно дождитесь повторного запуска приложения!';

  if (!releaseNotes || Array.isArray(releaseNotes)) return infoText;

  return `${yaml.parse(releaseNotes)[version]}\n${infoText}`;
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
