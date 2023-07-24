import { ipcRenderer } from 'electron';

declare global {
  namespace NodeJS {
    interface Global {
      config: TGlobalConfig;
      readonly state: TGlobalState;
      errors: TGlobalErrors;
      releaseNotes: ReleaseNotes;
    } 
  }

  interface Window {
    adminDesktop: TAdminDesktop;
  }

  type TAdminDesktop = {
    config?: TGlobalConfig;
    state?: TGlobalState;
    errors?: TGlobalErrors;
    ipcRenderer?: {
      on: TIpcRendererWindowOn;
      removeListener: TIpcRendererWindowRemoveListener;
      send: TIpcRendererWindowSend;
    };
  };

  type Mutable<T> = { -readonly [P in keyof T]: T[P] };

  type TGlobalConfig =
    Partial<ClassicConfig> &
    Partial<KKMServerConfig> &
    Partial<MoySkladConfig> &
    Partial<LokiConfig> & {
      MODE: string;
      PPS_ID: string;
      BOOKING_ADMIN_URL: string;
      BOOKING_API_URL: string;
      WINSTRIKE_ID_URL: string;
      PS_WS_URL: string;
      PS_HTTP_URL: string;
      SENTRY_DSN?: string;
      AUTOUPDATE?: string;
      DEV_SERVER_URL?: string;
      DEV_TOOLS?: string;
    };
  type ClassicConfig = {
    TERMINAL_MODEL: string;
    TERMINAL_ADDRESS: string;
    TERMINAL_ACQUIRING?: string;
    PRINTER_MODEL: string;
    PRINTER_ADDRESS: string;
    DISABLE_AUTO_CLOSE_SHIFT?: string;
    DISABLE_PRINTER_HEALTHCHECK?: string;
    TEST_MODE?: string;
  };
  type KKMServerConfig = {
    CHECKING_RESULT_RETRIES_COUNT?: string;
  };
  type MoySkladConfig = {
    MOY_SKLAD_URL?: string;
    MOY_SKLAD_SALEPOINT_ID?: string;
    MOY_SKLAD_LOGIN?: string;
    MOY_SKLAD_PASSWORD?: string;
  };
  type LokiConfig = {
    LOKI_URL: string;
    LOKI_LOGIN: string;
    LOKI_PASSWORD: string;
  };
  
  type TGlobalState = {
    ppsLogMessage: string;
    isPpsStarted: boolean;
    isProductsModalOpen: boolean;
    isCashBoxModalOpen: boolean;
    isCorrectionModalOpen: boolean;
    ppsError?: string;
    wsStatus?: 'connecting' | 'connected';
  };

  type TGlobalStateUpdatable = Pick<
    TGlobalState,
    'isCashBoxModalOpen' | 'isCorrectionModalOpen' | 'isProductsModalOpen'
  >;
  
  type TGlobalErrors = {
    main?: string;
  };

  type TCashBoxActionType = 'withdraw' | 'deposit';

  type TCashBoxActionParams = {
    type: TCashBoxActionType;
    amount: number;
  };

  type ReleaseNotes = {
    [key: string]: string;
  };
}

type TIpcRendererWindowOn = (...args: Parameters<typeof ipcRenderer.on>) => void;
type TIpcRendererWindowRemoveListener = (...args: Parameters<typeof ipcRenderer.removeListener>) => void;
type TIpcRendererWindowSend = (...args: Parameters<typeof ipcRenderer.send>) => void;
