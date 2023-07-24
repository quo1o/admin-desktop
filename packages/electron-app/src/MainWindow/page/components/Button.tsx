import { h, ComponentChildren } from 'preact';
import styled from 'styled-components';

type TProps = {
  className?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  type?: 'submit' | 'button';
  children: ComponentChildren;
};

const Button = ({ className, onClick, isDisabled, type, children }: TProps): JSX.Element => (
  <Container className={className} type={type} disabled={isDisabled} onClick={onClick}>{children}</Container>
);

const Container = styled.button`
  border: 1px solid #10181f;
  border-radius: 6px;
  padding: 10px 10px;
  background-color: #cf1060;
  cursor: pointer;
  font-size: 1.1em;

  &:hover {
    filter: brightness(0.8);
  }
  &:active {
    filter: brightness(0.6);
  }
  &:disabled {
    filter: grayscale(0.5);
    cursor: not-allowed;
  }
`;

export default Button;
