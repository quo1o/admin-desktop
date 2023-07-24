import type { FunctionComponent } from 'preact';
import { h } from 'preact';
import styled from 'styled-components';

import Spinner from './Spinner';

type TProps = {
  className?: string;
  logMessage: string;
};

const Loading: FunctionComponent<TProps> = ({ className, logMessage }) => (
  <Container className={className}>
    <Spinner />
    <p>{logMessage}...</p>
  </Container>
);

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export default Loading;
