import { h, FunctionComponent, Fragment } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { TPaymentMethod } from '@winstrike/pps-typings/printer';

import { TClub } from '../../../typings/clubs';
import { TProduct, TProductWithCountAndTotal, ProductCategory } from '../../../typings/products';
import { convertDigitalGoodsToProducts } from '../helpers';
import useBookingApi from '../hooks/useBookingApi';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';
import ClubSelect from './ClubSelect';
import ProductsSelect from './ProductsSelect';
import TabNavigation, { Tab } from './TabNavigation';
import Label from './Label';
import Input from './Input';

const clubIdsForDigitalGoods = [3, 9, 10, 11, 12, 14, 16, 17];
const digitalGoodCategories = [
  { id: 1, name: 'Неизвестно' },
  { id: 2, name: 'Xbox Game Pass' },
];
const digitalGoodCategoryToId: Record<string, number> = {
  'buka-game-pass': 2,
};

type TProps = {
  className?: string;
};

const ProductsSelling: FunctionComponent<TProps> = ({ className }) => {
  const [clubs, setClubs] = useState<TClub[] | null>(null);
  const [productCategories, setProductCategories] = useState<ProductCategory[] | null>(null);
  const [clubProducts, setClubProducts] = useState<TProduct[] | null>(null);
  const [digitalGoods, setDigitalGoods] = useState<TProduct[] | null>(null);
  const [selectedClub, setSelectedClub] = useState<TClub | null>(null);
  const phoneNumberInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const {
    request: {
      getClubs,
      getProductCategories,
      getClubProducts,
      getDigitalGoods,
      postProductsOrder,
      postDigitalGoodsOrder,
    },
    state: {
      isClubsLoading,
      isProductCategoriesLoading,
      isClubProductsLoading,
      isDigitalGoodsLoading,
      isProductsOrderSaving,
      isDigitalGoodsOrderSaving,
    },
  } = useBookingApi();

  const onClubClick = useCallback((club: TClub) => {
    setSelectedClub(club);
  }, []);

  const onProductsSellClick = useCallback(async (
    selectedProducts: TProductWithCountAndTotal[],
    paymentMethod: TPaymentMethod,
  ) => {
    if (!selectedClub) return false;

    const items = selectedProducts.map(({ id, count }) => ({ id, count }));

    try {
      await postProductsOrder(selectedClub.id, { paymentMethod, items });
    } catch (e) {
      toast(e.response?.data?.message || e.message, { type: 'error' });
      return false;
    }

    return true;
  }, [selectedClub, postProductsOrder]);

  const onDigitalGoodsSellClick = useCallback(async (
    selectedProducts: TProductWithCountAndTotal[],
    paymentMethod: TPaymentMethod,
  ) => {
    if (!selectedClub) return false;
    if (!phoneNumberInputRef.current?.validity.valid) {
      toast('Укажите корректный номер телефона клиента', { type: 'error', autoClose: 5000 });
      return false;
    }

    const goods = selectedProducts.map(({ id, count }) => ({ id, quantity: count }));

    try {
      await postDigitalGoodsOrder(selectedClub.id, {
        phoneNumber: phoneNumberInputRef.current.value,
        paymentMethod,
        goods,
      // Now we can sell digital goods only of buka-game-pass category
      }, 'buka-game-pass');
    } catch (e) {
      toast(e.response?.data?.message || e.message, { type: 'error' });
      return false;
    }

    return true;
  }, [selectedClub, postDigitalGoodsOrder]);

  useEffect(() => {
    getClubs()
      .then((clubs) => {
        if (clubs.length === 1) {
          setSelectedClub(clubs[0]);
          setClubs(clubs);
        } else {
          setClubs(clubs);
        }
      })
      .catch(error => setError(error.message));
  }, [getClubs]);

  useEffect(() => {
    if (selectedClub) {
      getProductCategories(selectedClub.id)
        .then(setProductCategories)
        .catch(error => setError(error.message));
      getClubProducts(selectedClub.id)
        .then(setClubProducts)
        .catch(error => setError(error.message));
      if (clubIdsForDigitalGoods.includes(selectedClub.id)) {
        getDigitalGoods()
          .then(({ goods, s3 }) => setDigitalGoods(
            convertDigitalGoodsToProducts(goods, s3, digitalGoodCategoryToId),
          ))
          .catch(error => setError(error.message));
      }
    }
  }, [selectedClub, getProductCategories, getClubProducts, getDigitalGoods]);

  const isLoading =
    isClubsLoading ||
    isProductCategoriesLoading ||
    isClubProductsLoading ||
    isDigitalGoodsLoading ||
    isProductsOrderSaving ||
    isDigitalGoodsOrderSaving;

  return (
    <Container className={className} hasFixedWidth={Boolean(selectedClub)}>
      {!error && clubs && !selectedClub && <ClubSelect clubs={clubs} onClubClick={onClubClick} />}
      {!error && !isLoading && clubProducts && productCategories && (
        <Fragment>
          {!digitalGoods ? (
            <ProductsSelect
              products={clubProducts}
              categories={productCategories}
              onSellClick={onProductsSellClick}
            />
          ) : (
            <TabNavigation>
              <Tab key="products" tabId="products" name="Товары и услуги">
                <ProductsSelect
                  products={clubProducts}
                  categories={productCategories}
                  onSellClick={onProductsSellClick}
                />
              </Tab>
              <Tab key="digital" tabId="digital" name="Цифровые товары">
                <ProductsSelect
                  products={digitalGoods}
                  categories={digitalGoodCategories}
                  onSellClick={onDigitalGoodsSellClick}
                >
                  <Label htmlFor="phoneNumber">Номер телефона клиента</Label>
                  <StyledInput
                    id="phoneNumber"
                    name="phoneNumber"
                    ref={phoneNumberInputRef}
                    type="tel"
                    placeholder="+7##########"
                    pattern="\+7\d{10}"
                    required
                  />
                </ProductsSelect>
              </Tab>
            </TabNavigation>
          )}
        </Fragment>
      )}
      {isLoading && <Spinner color="black" />}
      {error && <ErrorBlock message={error} />}
    </Container>
  );
};

type ContainerProps = {
  hasFixedWidth?: boolean;
};
const Container = styled.div<ContainerProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${({ hasFixedWidth }) => hasFixedWidth ? '680px' : '100%'};
`;

const StyledInput = styled(Input)`
  margin-bottom: 10px;
`;

export default ProductsSelling;
