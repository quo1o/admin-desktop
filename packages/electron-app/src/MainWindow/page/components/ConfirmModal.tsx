import { h, render, FunctionComponent } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import styled from 'styled-components';

import Modal from './Modal';
import Button from './Button';

type TProps = {
  text: string;
  okText?: string;
  cancelText?: string;
  onOkClick: () => void;
  onCancelClick: () => void;
};

const ID = 'confirm-modal';

const ConfirmModal: FunctionComponent<TProps> = (props) => {
  const { text, okText = 'OK', cancelText = 'Назад', onOkClick, onCancelClick } = props;
  return (
    <ModalStyled>
      <Container>
        <Text>{text}</Text>
        <ButtonStyled onClick={onOkClick}>{okText}</ButtonStyled>
        <ButtonStyled onClick={onCancelClick}>{cancelText}</ButtonStyled>
      </Container>
    </ModalStyled>
  );
};

const ModalStyled = styled(Modal).attrs({ isOpen: true, withHeader: false })`
  padding: 10px 10px;
`;

const Container = styled.div`
  display: grid;
  grid-template-areas: 'a a a a'
                       'b b c d';
  grid-template-columns: auto auto 85px 85px;
  gap: 10px 10px;
`;

const Text = styled.p`
  font-size: 1.1rem;
  grid-area: a;
`;

const ButtonStyled = styled(Button)`
  grid-area: c;

  &:last-child {
    grid-area: d;
  }
`;

function confirm (text: string, params: Pick<TProps, 'okText' | 'cancelText'> = {}) {
  const { okText, cancelText } = params;
  return new Promise((resolve) => {
    const onClick = (value: boolean) => () => {
      removeElement();
      resolve(value);
    }; 
    createElement({
      text,
      okText,
      cancelText,
      onOkClick: onClick(true),
      onCancelClick: onClick(false),
    });
  });
}

function createElement (props: TProps) {
  let divTarget = document.getElementById(ID);
  if (divTarget) {
    render(<ConfirmModal {...props} />, divTarget);
  } else {
    divTarget = document.createElement('div');
    divTarget.id = ID;
    document.body.appendChild(divTarget);
    render(<ConfirmModal {...props} />, divTarget);
  }
}

function removeElement () {
  const target = document.getElementById(ID);
  if (target) {
    unmountComponentAtNode(target);
    target.parentNode?.removeChild(target);
  }
}

export { confirm };
export default ConfirmModal;
