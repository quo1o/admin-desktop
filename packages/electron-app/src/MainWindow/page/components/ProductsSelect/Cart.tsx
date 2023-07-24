import { h } from 'preact';
import { useCallback } from 'preact/hooks';
import styled from 'styled-components';

import { TProductWithCountAndTotal } from '../../../../typings/products';
import { getSubjectSignName } from '../../helpers';
import ErrorBlock from '../ErrorBlock';
import Button from '../Button';

type TProps = {
  className?: string;
  onRemoveClick: (product: TProductWithCountAndTotal) => void;
  products: TProductWithCountAndTotal[];
};

// TODO: add remove button
const Cart = ({ className, onRemoveClick, products }: TProps): JSX.Element => {
  const getRemoveClickHandler = useCallback((product: TProductWithCountAndTotal) => () => {
    onRemoveClick(product);
  }, [onRemoveClick]);

  return (
    <Container className={className}>
      <Heading>Товары в чеке:</Heading>
      {products.length ? (
        <Products>
          {products.map((product, i) => {
            const { id, name, subjectSign, total, count } = product;
            return (
              <Product key={id}>
                <span>{i + 1}. {name} ({getSubjectSignName(subjectSign)}) x{count} - {total / 100} руб.</span>
                <RemoveButton onClick={getRemoveClickHandler(product)}>✖️</RemoveButton>
              </Product>
            );
          })}
        </Products>
      ) : (
        <ErrorBlock message="Не выбрано ни одного товара" />
      )}
    </Container>
  );
};

const Container = styled.ul`
  background-color: #f9e29c;
  padding: 20px 15px;
  border-radius: 6px;
`;

const Heading = styled.h3`
  margin-top: 0;
`;

const Products = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Product = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:not(:last-child) {
    margin-bottom: 5px;
  }
`;

const RemoveButton = styled(Button)`
  background: none;
  padding: 0 0 2px 0;
`;

export default Cart;
