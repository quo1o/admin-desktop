import { h } from 'preact';
import styled from 'styled-components';

import placeholder from '../assets/image-placeholder.svg';

type Props = React.HTMLAttributes<HTMLImageElement> & {
  className?: string;
  src?: string | null;
  width: number;
  height: number;
};

const Image = ({ className, src, width, height }: Props): JSX.Element => (
  <Container className={className} src={src || placeholder} width={width} height={height} />
);

const Container = styled.img<Pick<Props, 'width' | 'height'>>`
  width: ${({ width }) => `${width}px`};
  height: ${({ height }) => `${height}px`};
`;

export default Image;
