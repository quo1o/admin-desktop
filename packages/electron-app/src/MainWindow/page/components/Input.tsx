import styled, { css } from 'styled-components';

const InputStyle = css`
  height: 44px;
  font-size: 1rem;
  grid-column: 2 / 4;
  border: 1px solid black;
  border-radius: 6px;
  background-color: #cf10600a;
`;

const Input = styled.input`
  padding: 5px 10px;

  ${InputStyle}
`;

export { InputStyle };
export default Input;
