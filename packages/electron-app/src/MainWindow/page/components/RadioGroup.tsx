import { h, ComponentChildren } from 'preact';
import styled, { css } from 'styled-components';

type TProps = {
  className?: string;
  direction?: TDirection;
  children: ComponentChildren;
};

type TDirection = 'horizontal' | 'vertical';

const RadioGroup = ({ className, direction = 'horizontal', children }: TProps): JSX.Element => {
  return (
    <Container className={className} direction={direction}>
      {children}
    </Container>
  );
};

type TContainerProps = {
  direction: TDirection;
};
const Container = styled.div<TContainerProps>`
  display: flex;
  flex-direction: ${({ direction }) => direction === 'horizontal' ? 'row' : 'column'};
  align-items: ${({ direction }) => direction === 'horizontal' ? 'center' : 'flex-start'};

  ${({ direction }) => direction === 'horizontal' && css`
    margin: -5px;

    & > * {
      margin: 5px;
    }
  `};
`;

export default RadioGroup;
