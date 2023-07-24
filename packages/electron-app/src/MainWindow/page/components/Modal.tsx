import type { ComponentChildren } from 'preact';
import { h } from 'preact';
import styled from 'styled-components';
import ReactModal from 'react-modal';

type TProps = {
  className?: string;
  name?: string;
  isOpen: boolean;
  onCloseClick?: () => void;
  withHeader?: boolean;
  children: ComponentChildren;
};

const Modal = ({ className, name, withHeader = true, isOpen, onCloseClick, children }: TProps): JSX.Element => (
  <Container
    style={{ overlay: overlayStyle }}
    isOpen={isOpen}
    shouldCloseOnOverlayClick={false}
    ariaHideApp={false}
  >
    {withHeader && (
      <Header>
        <Name>{name}</Name>
        <CloseButton onClick={onCloseClick} />
      </Header>
    )}
    <Content className={className}>{children}</Content>
  </Container>
);

const Container = styled(ReactModal)`
  background-color: white;
  color: black;
  outline: none;
  border: 1px solid #10181f;
  border-radius: 8px;
  width: max-content;
  padding: 0;
  max-height: 100%;
  overflow-y: auto;
`;

const overlayStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #10181f;
  border-top-right-radius: 5px;
  border-top-left-radius: 5px;
`;

const Name = styled.h3`
  color: white;
  margin: 0 5px 0 0;
`;

const CloseButton = styled.button`
  position: relative;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  padding: 5px;
  cursor: pointer;
  outline: none;

  &:hover {
    opacity: 0.8;
  }
  &:before, &:after {
    position: absolute;
    top: 0;
    left: 15px;
    content: ' ';
    height: 33px;
    width: 2px;
    background-color: white;
  }
  &:before {
    transform: rotate(45deg);
  }
  &:after {
    transform: rotate(-45deg);
  }
`;

const Content = styled.div`
  padding: 20px 15px;
`;

export default Modal;
