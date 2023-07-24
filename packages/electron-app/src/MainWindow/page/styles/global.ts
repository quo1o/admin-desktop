import { createGlobalStyle } from 'styled-components';
import 'react-toastify/dist/ReactToastify.css';

import FontsStyle from './fonts';

const GlobalStyle = createGlobalStyle`
  ${FontsStyle}

  html {
    color: white;
    font-family: 'Exo2';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
  }

  body {
    height: 100%;
    margin: 0;
  }

  #root {
    height: 100%;
  }

  button, input, select {
    font-family: 'Exo2';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: all 200ms;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 1px #cf1060;
    }
  }

  * {
    box-sizing: border-box;
  }
`;

export default GlobalStyle;
