import type { FunctionComponent } from 'preact';
import { h } from 'preact';
import { ToastContainer } from 'react-toastify';

import GlobalStateProvider from './GlobalStateContext';
import TokenProvider from './TokenContext';
import Main from './Main';

import GlobalStyle from '../styles/global';

const App: FunctionComponent = () => (
  <GlobalStateProvider>
    <TokenProvider>
      <GlobalStyle />
      <Main />
      <ToastContainer position="top-center" autoClose={false} />
    </TokenProvider>
  </GlobalStateProvider>
);

export default App;
