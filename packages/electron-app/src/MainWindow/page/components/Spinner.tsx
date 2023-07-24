import type { FunctionComponent } from 'preact';
import { h } from 'preact';
import styled, { keyframes } from 'styled-components';

type TProps = {
  className?: string;
  color?: TColor;
};

type TColor = 'white' | 'black';

const Spinner: FunctionComponent<TProps> = ({ className, color }) => {
  return (
    <Container className={className} color={color}>
      <div /><div /><div /><div /><div /><div />
      <div /><div /><div /><div /><div /><div />
    </Container>
  );
};

const spinner = keyframes`
  0%, 20%, 80%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
`;

type TContainerProps = {
  color?: TColor;
};
const Container = styled.div<TContainerProps>`
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;

  & > div {
    position: absolute;
    width: 6px;
    height: 6px;
    background: ${({ color }) => color || 'white'};
    border-radius: 50%;
    animation: ${spinner} 1.2s linear infinite;

    &:nth-child(1) {
      animation-delay: 0s;
      top: 37px;
      left: 66px;
    }
    &:nth-child(2) {
      animation-delay: -0.1s;
      top: 22px;
      left: 62px;
    }
    &:nth-child(3) {
      animation-delay: -0.2s;
      top: 11px;
      left: 52px;
    }
    &:nth-child(4) {
      animation-delay: -0.3s;
      top: 7px;
      left: 37px;
    }
    &:nth-child(5) {
      animation-delay: -0.4s;
      top: 11px;
      left: 22px;
    }
    &:nth-child(6) {
      animation-delay: -0.5s;
      top: 22px;
      left: 11px;
    }
    &:nth-child(7) {
      animation-delay: -0.6s;
      top: 37px;
      left: 7px;
    }
    &:nth-child(8) {
      animation-delay: -0.7s;
      top: 52px;
      left: 11px;
    }
    &:nth-child(9) {
      animation-delay: -0.8s;
      top: 62px;
      left: 22px;
    }
    &:nth-child(10) {
      animation-delay: -0.9s;
      top: 66px;
      left: 37px;
    }
    &:nth-child(11) {
      animation-delay: -1s;
      top: 62px;
      left: 52px;
    }
    &:nth-child(12) {
      animation-delay: -1.1s;
      top: 52px;
      left: 62px;
    }
  }
`;

export default Spinner;
