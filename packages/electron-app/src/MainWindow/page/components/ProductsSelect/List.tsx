import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import styled from 'styled-components';
import { getImageUrl } from '@winstrike/images-cdn';

import { TProduct, TProductWithCount } from '../../../../typings/products';
import { Image as TImage, S3Config } from '../../../../typings/images';
import { getSubjectSignName } from '../../helpers';
import Button from '../Button';
import ErrorBlock from '../ErrorBlock';
import Image from '../Image';

type TProps = {
  className?: string;
  onAddClick: (item: TProductWithCount) => void;
  products: TProduct[];
};

const List = ({ className, onAddClick, products }: TProps): JSX.Element => {
  const counterRefs = useRef<{ [id: number]: HTMLInputElement | null }>({});

  const getAddClickHandler = useCallback((item: TProduct) => () => {
    const counterRef = counterRefs.current[item.id];
    if (counterRef) {
      const count = counterRef.value;
      counterRef.value = '1';
      onAddClick({ ...item, count: count ? parseInt(count, 10) : 1 });
    }
  }, [onAddClick]);

  return (
    <Container className={className}>
      {products.length ? (
        <Products>
          {products.map((product) => {
            const { id, name, subjectSign, priceInCents, image, config } = product;
            return (
              <Product key={id}>
                <ImageStyled
                  src={getImageSrc(config, image)}
                  width={image?.width || 48}
                  height={image?.height || 48}
                />
                <h4>{name}</h4>
                {'\u00a0'}
                <SubjectSign>({getSubjectSignName(subjectSign)})</SubjectSign>
                <Price>{priceInCents / 100} руб.</Price>
                <Counter ref={(ref) => (counterRefs.current[id] = ref)} />
                <Button onClick={getAddClickHandler(product)}>Добавить</Button>
              </Product>
            );
          })}
        </Products>
      ) : (
        <ErrorBlock message="Нет товаров" />
      )}
    </Container>
  );
};

function getImageSrc (config?: { s3: S3Config }, image?: TImage) {
  if (!config || !image) return null;

  const { width = 48, height = 48 } = image;
  
  return getImageUrl(image, config.s3, { width, height });
}

const Container = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const Products = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Product = styled.li`
  display: flex;
  align-items: center;
  padding: 10px 10px;
  border: 1px solid #10181f;
  border-radius: 6px;

  & > h4 {
    margin: 0;
  }

  &:not(:last-child) {
    margin-bottom: 5px;
  }
`;

const ImageStyled = styled(Image)`
  margin-right: 10px;
`;

const SubjectSign = styled.span`
  margin-right: 10px;
`;

const Price = styled.span`
  margin-left: auto;
`;

const Counter = styled.input.attrs(() => ({ type: 'number', min: 1, defaultValue: 1 }))`
  width: 40px;
  margin: 0 10px;
`;

export default List;
