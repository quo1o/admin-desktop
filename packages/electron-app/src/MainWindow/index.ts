import { app, dialog, BrowserWindow, Menu, MenuItem, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { rcompare as semverRCompare } from 'semver';

import { runIfPpsStarted } from '../helpers';
import { reportError } from '../services/error-reporter';

type TProps = {
  menuTemplate: MenuItemConstructorOptions[];
  pageUrl?: string;
  isDevTools: boolean;
};

class MainWindow {
  constructor ({ menuTemplate, pageUrl, isDevTools }: TProps) {
    this.pagePath = path.join(__dirname, 'page/index.html');
    this.window = this.createWindow({ menuTemplate, isDevTools });
    // load page of the app.
    this.loadPage(pageUrl);
  }

  private pagePath: string;
  window: BrowserWindow | null;

  private createWindow ({ menuTemplate, isDevTools }: TProps) {
    const newWindow: BrowserWindow = new BrowserWindow({
      show: false,
      icon: path.join(process.cwd(), 'assets/icon.ico'),
      backgroundColor: '#fff',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        devTools: isDevTools,
        contextIsolation: true,
        enableRemoteModule: true,
      },
    });
  
    const menu = new Menu();
    menu.append(new MenuItem({
      label: 'Меню',
      submenu: Menu.buildFromTemplate(menuTemplate),
    }));
    menu.append(new MenuItem({
      label: 'Продажа товаров',
      click: () => runIfPpsStarted(() => (global.state.isProductsModalOpen = true)),
    }));
    menu.append(new MenuItem({
      label: 'Денежный ящик',
      click: () =>  runIfPpsStarted(() => (global.state.isCashBoxModalOpen = true)),
    }));
    menu.append(new MenuItem({
      label: 'Чек коррекции',
      click: () =>  runIfPpsStarted(() => (global.state.isCorrectionModalOpen = true)),
    }));
    menu.append(new MenuItem({
      type: 'separator',
    }));
    menu.append(new MenuItem({
      label: 'О программе',
      submenu: getInfoMenuTemplate(newWindow),
    }));
    newWindow.setMenu(menu);
  
    newWindow.maximize();
  
    newWindow.once('ready-to-show', () => {
      newWindow?.show();
    });
  
    // Open the DevTools.
    if (isDevTools) {
      newWindow.webContents.openDevTools();
    }
  
    // @ts-ignore
    newWindow.onbeforeunload = function (e) {
      e.preventDefault();
    };
  
    newWindow.on('close', (evt) => {
      evt.preventDefault();
      newWindow.destroy();
    });

    // Emitted when the window is closed.
    newWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this.window = null;
    });
  
    return newWindow;
  }

  private loadPage (url?: string) {
    if (this.window) {
      (url ? this.window.loadURL(url) : this.window.loadFile(this.pagePath))
        .catch(reportError);
    }
  }
}

function getInfoMenuTemplate (window: BrowserWindow) {
  return [
    { label: 'Список изменений', click: getReleaseNotesMessageHandler(window)},
    { label: 'О программе', click: getAboutMessageHandler(window)},
  ];
}

function getReleaseNotesMessageHandler (window: BrowserWindow) {
  const detail = Object.entries(global.releaseNotes)
    .sort(([a], [b]) => semverRCompare(a, b))
    .reduce((acc, [version, note]) => `${acc}${version}:\n${note}\n`, '')
    .trimEnd();

  return () => {
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Список изменений',
      message: 'Список изменений',
      detail,
    })
      .catch(reportError);
  };
}

function getAboutMessageHandler (window: BrowserWindow) {
  return () => {
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Касса Winstrike',
      message: `Касса Winstrike версия ${app.getVersion()}`,
      detail: 'Winstrike © 2020',
    })
      .catch(reportError);
  };
}

export default MainWindow;
