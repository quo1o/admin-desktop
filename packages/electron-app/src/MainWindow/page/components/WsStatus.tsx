import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import styled from 'styled-components';

import { useGlobalState } from './GlobalStateContext';
import Spinner from './Spinner';

type Props = {
  className?: string;
};

const WsStatus = ({ className }: Props): JSX.Element | null => {
  const { state: { wsStatus } } = useGlobalState();
  const [shouldShowNote, setShouldShowNote] = useState(false);

  useEffect(() => {
    if (wsStatus === 'connecting') {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        setShouldShowNote(true);
      }, 30000);
    }
    if (wsStatus === 'connected') setShouldShowNote(false);
  }, [wsStatus]);

  if (!wsStatus) return null;

  return (
    <Container className={className}>
      {wsStatus === 'connecting' && (
        <Fragment>
          <Spinner color="black" />
          <Text>Устанавливается соединение с сервером...</Text>
          <Text isDanger>В данный момент терминал и принтер не будут отвечать на запросы!</Text>
          {shouldShowNote && (
            <Text isSmall>Если вы видите это сообщение слишком долго, попробуйте перезапустить приложение</Text>
          )}
        </Fragment>
      )}
      {wsStatus === 'connected' && (
        <Fragment>
          <SuccessfulIcon>✔️</SuccessfulIcon>
          <Text>Соединение с сервером установлено!</Text>
        </Fragment>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 200px;
  padding: 10px;
  border: 1px solid black;
  border-radius: 6px;
  background-color: white;

  & > *:not(:last-child) {
    margin-bottom: 10px;
  }
`;

type TextProps = {
  isDanger?: boolean;
  isSmall?: boolean;
};
const Text = styled.span<TextProps>`
  color: ${({ isDanger, isSmall }) => (isDanger && 'darkred') || (isSmall && 'darkgrey') || 'black'};
  text-align: center;
  ${({ isDanger }) => isDanger && 'font-weight: 600'};
  ${({ isSmall }) => isSmall && 'font-size: 0.8rem'};
`;

const SuccessfulIcon = styled.span`
  font-size: 58px;
  line-height: 80px;
`;

const WsStatusHideable = (props: Props): JSX.Element | null => {
  const { state: { wsStatus } } = useGlobalState();
  const [shouldShowWsStatus, setShouldShowWsStatus] = useState(false);

  useEffect(() => {
    if (wsStatus === 'connected') {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        setShouldShowWsStatus(false);
      }, 5000);
    }
    if (wsStatus === 'connecting') setShouldShowWsStatus(true);
  }, [wsStatus]);

  return shouldShowWsStatus ? <WsStatus {...props} /> : null;
};

export { WsStatus, WsStatusHideable };
