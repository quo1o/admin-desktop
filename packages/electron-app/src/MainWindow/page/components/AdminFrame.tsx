import { h } from 'preact';
import { useCallback } from 'preact/hooks';
import styled from 'styled-components';

import getGlobal from '../get-global';
import { setAdminFrame } from './TokenContext';

const { config } = getGlobal();

type TProps = {
  className?: string;
  onLoaded: () => void;
};

// Don't use preact.FunctionalComponent<TProps> because it's incompatible with styled-components
const AdminFrame = ({ className, onLoaded }: TProps): JSX.Element => {
  const setRef = useCallback((ref: HTMLIFrameElement | null) => {
    setAdminFrame(ref);
  }, []);

  return (
    <Container ref={setRef} className={className} src={config.BOOKING_ADMIN_URL} onLoad={onLoaded} />
  );
};

const Container = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
`;

export default AdminFrame;
