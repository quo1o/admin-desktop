import type { FunctionComponent, ComponentChildren } from 'preact';
import { h, createContext } from 'preact';
import { useEffect, useState, useCallback, useContext, useRef } from 'preact/hooks';

import getGlobal from '../get-global';

const ATTEMPT_INTERVAL_MS = 5000;
const MAX_ATTEMPT_COUNT = 100;

const { config } = getGlobal();

let adminFrame: HTMLIFrameElement | null = null;

function setAdminFrame (newAdminFrame: HTMLIFrameElement | null) {
  adminFrame = newAdminFrame;
}

const TokenContext = createContext(getValue(null, true, () => {}));

type TProps = {
  children: ComponentChildren;
};

const TokenProvider: FunctionComponent<TProps> = ({ children }) => {
  const attemptCount = useRef(0);
  const interval = useRef<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const onMessageReceived = useCallback(({ data, origin }: MessageEvent) => {
    if (origin === config.BOOKING_ADMIN_URL && data.message) {
      window.removeEventListener('message', onMessageReceived);
      setToken(data.message);
      setIsLoading(false);
    }     
  }, []);

  const getAdminToken = useCallback(() => {
    attemptCount.current += 1;

    if (!adminFrame) return;

    window.addEventListener('message', onMessageReceived);

    if (!config.BOOKING_ADMIN_URL) throw new Error('No BOOKING_ADMIN_URL specified');

    adminFrame.contentWindow?.postMessage({ type: 'request-token' }, config.BOOKING_ADMIN_URL);
  }, [onMessageReceived]);

  const startTokenRequest = useCallback(() => {
    setIsLoading(true);
    getAdminToken();
    interval.current = window.setInterval(() => {
      window.removeEventListener('message', onMessageReceived);
      if (attemptCount.current === MAX_ATTEMPT_COUNT) {
        if (interval.current) window.clearInterval(interval.current);
        attemptCount.current = 0;
        setIsLoading(false);
        return;
      }
      getAdminToken();
    }, ATTEMPT_INTERVAL_MS);
  }, [onMessageReceived, getAdminToken]);

  useEffect(() => {
    if (!token) startTokenRequest();
    else if (interval.current) window.clearInterval(interval.current);
  }, [token, startTokenRequest]);

  return (
    <TokenContext.Provider value={getValue(token, isLoading, startTokenRequest)}>
      {children}
    </TokenContext.Provider>
  );
};

function getValue (token: string | null, isLoading: boolean, startTokenRequest: () => void) {
  return ({ token, isLoading, startTokenRequest });
}

const useAdminToken = () => {
  return useContext(TokenContext);
};

export { TokenContext, useAdminToken, setAdminFrame };
export default TokenProvider;
