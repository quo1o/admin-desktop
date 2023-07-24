import { FunctionComponent, Fragment } from 'preact';
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import styled from 'styled-components';

import getGlobal from '../get-global';
import { useGlobalState } from './GlobalStateContext';
import AdminFrame from './AdminFrame';
import ErrorBlock from './ErrorBlock';
import Loading from './Loading';
import Modal from './Modal';
import TokenLoading from './TokenLoading';
import ProductsSelling from './ProductsSelling';
import CashBox from './CashBox';
import Correction from './Correction';
import { WsStatusHideable } from './WsStatus';
import useKKMConfig from '../hooks/useKKMConfig';

import background from '../assets/background.png';

const { errors, config } = getGlobal();

type TProps = {
  className?: string;
};

const Main: FunctionComponent<TProps> = ({ className }) => {
  const { state: {
    ppsLogMessage, ppsError, isPpsStarted, isProductsModalOpen, isCorrectionModalOpen, isCashBoxModalOpen,
  }, updateState } = useGlobalState();
  useKKMConfig();
  const [isAdminFrameLoaded, setIsAdminFrameLoaded] = useState(false);

  useEffect(() => {
    if (!isPpsStarted) setIsAdminFrameLoaded(false);
  }, [isPpsStarted]);

  const onAdminFrameLoaded = () => {
    setIsAdminFrameLoaded(true);
  };

  const getLogMessage = () => {
    if (config.MODE !== 'without-kkt-integration' && !isPpsStarted) return ppsLogMessage;
    return 'Зазгрузка админки';
  };

  const error = errors.main || ppsError;
  const shouldShowUI = !error && (config.MODE !== 'without-kkt-integration' ? isPpsStarted : true);

  return (
    <Container className={className}>
      {(!error && !isAdminFrameLoaded) && <Loading logMessage={getLogMessage()} />}
      {shouldShowUI && (
        <Fragment>
          <AdminFrameStyled isVisible={isAdminFrameLoaded} onLoaded={onAdminFrameLoaded} />
          {isAdminFrameLoaded && <WsStatusHideableStyled />}
          <Modal
            name="Продажа товаров"
            isOpen={isProductsModalOpen}
            onCloseClick={() => updateState({ isProductsModalOpen: false })}
          >
            <TokenLoading>
              <ProductsSelling />
            </TokenLoading>
          </Modal>
          <Modal
            name="Денежный ящик"
            isOpen={isCashBoxModalOpen}
            onCloseClick={() => updateState({ isCashBoxModalOpen: false })}
          >
            <CashBox />
          </Modal>
          <Modal
            name="Чек коррекции"
            isOpen={isCorrectionModalOpen}
            onCloseClick={() => updateState({ isCorrectionModalOpen: false })}
          >
            <Correction />
          </Modal>
        </Fragment>
      )}
      {error && <ErrorBlock message={error} />}
    </Container>
  );
};

const Container = styled.main`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: url(${background});
  background-size: cover;
  background-position: center;
`;

type TAdminFrameStyledProps = {
  isVisible: boolean;
};

const AdminFrameStyled = styled(AdminFrame)<TAdminFrameStyledProps>`
  display: ${({ isVisible }) => isVisible ? 'block' : 'none'};
`;

const WsStatusHideableStyled = styled(WsStatusHideable)`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10000;
`;

export default Main;
