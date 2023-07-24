import type { FunctionComponent, ComponentChildren } from 'preact';
import type { IpcRendererEvent } from 'electron';
import { h, createContext } from 'preact';
import { useEffect, useState, useCallback, useContext } from 'preact/hooks';

import getGlobal from '../get-global';

const STATE_UPDATING_CHANNEL_NAME = 'main:state-changed';

const { ipcRenderer, state: initialState } = getGlobal();

const GlobalStateContext = createContext(getValue(initialState));

type TProps = {
  children: ComponentChildren;
};

const GlobalStateProvider: FunctionComponent<TProps> = ({ children }) => {
  const [state, setState] = useState(initialState);

  const onStateUpdate = useCallback((_: IpcRendererEvent, updatedStateJSON: string) => {
    setState(JSON.parse(updatedStateJSON));
  }, []);

  useEffect(() => {
    ipcRenderer.on(STATE_UPDATING_CHANNEL_NAME, onStateUpdate);
    return () => {
      ipcRenderer.removeListener(STATE_UPDATING_CHANNEL_NAME, onStateUpdate);
    };
  }, [onStateUpdate]);

  return (
    <GlobalStateContext.Provider value={getValue(state)}>
      {children}
    </GlobalStateContext.Provider>
  );
};

function getValue (state: TGlobalState) {
  return ({
    state,
    updateState: (newState: Partial<TGlobalStateUpdatable>) => {
      ipcRenderer.send('main:update-state', JSON.stringify(newState));
    },
  });
}

const useGlobalState = () => {
  const { state, updateState } = useContext(GlobalStateContext);
  return { state, updateState };
};

export { GlobalStateContext, useGlobalState };
export default GlobalStateProvider;
