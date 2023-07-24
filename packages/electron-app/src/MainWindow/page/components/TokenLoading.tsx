import { h, ComponentChildren, FunctionComponent } from 'preact';
import styled from 'styled-components';
import { useEffect, useState, useCallback } from 'preact/hooks';

import { useAdminToken } from './TokenContext';
import Button from './Button';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

type TProps = {
  children: ComponentChildren;
};

const TokenLoading: FunctionComponent<TProps> = ({ children }) => {
  const [error, setError] = useState('');
  const { token, isLoading, startTokenRequest } = useAdminToken();

  const onTokenRequestClick = useCallback(() => {
    setError('');
    startTokenRequest();
  }, [startTokenRequest]);

  useEffect(() => {
    if (!isLoading && !token) {
      setError('Не обнаружена авторизация в админке');
    }
  }, [isLoading, token]);

  return (
    <Container>
      {!isLoading && token && children}
      {isLoading && <Spinner color="black" />}
      {error && (
        <ErrorContainer>
          <ErrorBlockStyled message={error} />
          <Button onClick={onTokenRequestClick}>Повторить</Button>
        </ErrorContainer>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const ErrorBlockStyled = styled(ErrorBlock)`
  margin: 0 0 20px 0;
`;

export default TokenLoading;
