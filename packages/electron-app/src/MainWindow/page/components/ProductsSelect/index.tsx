import { h, FunctionComponent, ComponentChildren } from 'preact';
import styled from 'styled-components';
import { useState, useCallback } from 'preact/hooks';
import { TPaymentMethod } from '@winstrike/pps-typings/printer';

import { TProduct, TProductWithCount, TProductWithCountAndTotal, ProductCategory } from '../../../../typings/products';
import Cart from './Cart';
import List from './List';
import Button from '../Button';
import RadioGroup from '../RadioGroup';
import Radio from '../Radio';
import { confirm } from '../ConfirmModal';
import SearchAndFilter from './SearchAndFilter';
import { toast } from 'react-toastify';

type TProps = {
  className?: string;
  categories: ProductCategory[];
  products: TProduct[];
  maxProductCount?: number;
  onSellClick: (
    selectedProducts: TProductWithCountAndTotal[],
    paymentMethod: TPaymentMethod,
  ) => Promise<boolean> | boolean;
  children?: ComponentChildren;
};

const ProductsSelect: FunctionComponent<TProps> = ({
  className, categories, products, onSellClick: onSellClickFromProps, children,
}) => {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [selectedProducts, setSelectedProducts] = useState<TProductWithCountAndTotal[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethod>('card');

  const onAddClick = useCallback((addedProduct: TProductWithCount) => {
    const index = selectedProducts.findIndex(({ id }) => id === addedProduct.id);

    if (index >= 0) {
      const { maxProductCount } = selectedProducts[index];
      const count = selectedProducts[index].count + addedProduct.count;

      if (maxProductCount && count > maxProductCount) {
        toast(
          `Превышено максимальное количество для данного продукта: ${maxProductCount}`,
          { type: 'error', autoClose: 5000 },
        );
        return;
      }

      const newSelectedProducts = [...selectedProducts];
      newSelectedProducts[index] = {
        ...addedProduct,
        count,
        total: addedProduct.priceInCents * count,
      };
      setSelectedProducts(newSelectedProducts);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          ...addedProduct,
          total: addedProduct.priceInCents * addedProduct.count,
        },
      ]);
    }
  }, [selectedProducts]);

  const onRemoveClick = useCallback(({ id: idToRemove }: TProductWithCountAndTotal) => {
    setSelectedProducts(selectedProducts.filter(({ id }) => id !== idToRemove));
  }, [selectedProducts]);

  const onPaymentMethodChange = useCallback((value: TPaymentMethod) => {
    setPaymentMethod(value);
  }, []);

  const onResetClick = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  const onSellClick = useCallback(async () => {
    if (paymentMethod === 'cash' && !(await confirm('Клиент передал вам денежные средства?'))) return;

    const isSuccess = await onSellClickFromProps(selectedProducts, paymentMethod);

    if (isSuccess) setSelectedProducts([]);
  }, [selectedProducts, paymentMethod, onSellClickFromProps]);

  const isButtonsDisabled = !selectedProducts.length;

  return (
    <Container className={className}>
      <CartStyled products={selectedProducts} onRemoveClick={onRemoveClick} />
      <SearchAndFilter products={products} categories={categories} onSearchOrFilterCompleted={setFilteredProducts} />
      <ListStyled products={filteredProducts} onAddClick={onAddClick} />
      {children}
      <Control>
        <RadioGroup direction="vertical">
          <Radio
            name="paymentMethod"
            value="card"
            label="Карта"
            onInput={onPaymentMethodChange}
            isChecked={paymentMethod === 'card'}
          />
          <Radio
            name="paymentMethod"
            value="cash"
            label="Наличные"
            onInput={onPaymentMethodChange}
            isChecked={paymentMethod === 'cash'}
          />
        </RadioGroup>
        <ResetButton onClick={onResetClick} isDisabled={isButtonsDisabled}>Очистить</ResetButton>
        <Button onClick={onSellClick} isDisabled={isButtonsDisabled}>Продать</Button>
      </Control>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  min-width: 500px;
`;

const CartStyled = styled(Cart)`
  margin-bottom: 20px;
`;

const ListStyled = styled(List)`
  margin: 10px 0 20px 0;
`;

const Control = styled.div`
  display: flex;
`;

const ResetButton = styled(Button)`
  margin-left: auto;
  margin-right: 10px;
`;

export default ProductsSelect;
