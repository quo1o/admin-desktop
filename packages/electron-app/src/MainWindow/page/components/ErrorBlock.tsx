import { h } from 'preact';
import styled from 'styled-components';

type TProps = {
  className?: string;
  message: string;
};

const ErrorBlock = ({ className, message }: TProps): JSX.Element => (
  <Container className={className}>{message}</Container>
);

const Container = styled.p`
  font-size: 2em;
  color: darkred;
  text-align: center;
`;

export default ErrorBlock;
