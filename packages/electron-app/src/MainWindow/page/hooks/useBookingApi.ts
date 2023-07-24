import { useState, useCallback, useMemo } from 'preact/hooks';
import Axios from 'axios';
import { TPaymentMethod } from '@winstrike/pps-typings/printer';

import { User } from '../../../typings/users';
import { TClub } from '../../../typings/clubs';
import { TProduct, ProductCategory } from '../../../typings/products';
import { DigitalGood } from '../../../typings/digital-goods';
import { getRequestMethod } from '../helpers';
import getGlobal from '../get-global';
import { useAdminToken } from '../components/TokenContext';
import { S3Config } from '../../../typings/images';

const { config } = getGlobal();

const axios = Axios.create({ baseURL: config.BOOKING_API_URL });

type TProductsOrderBody = {
	paymentMethod: TPaymentMethod;
	items: Array<{ id: number; count: number }>;
};

type DigitalGoodsOrderBody = {
  phoneNumber: string;
  paymentMethod: TPaymentMethod;
  goods: Array<{ id: number; quantity: number }>;
};

type DigitalGoodsResponse = {
  goods: DigitalGood[];
  s3: S3Config & { bucket: string };
};

type RequestState = {
  isUserLoading: boolean;
  isClubsLoading: boolean;
  isProductCategoriesLoading: boolean;
  isClubProductsLoading: boolean;
  isDigitalGoodsLoading: boolean;
  isProductsOrderSaving: boolean;
  isDigitalGoodsOrderSaving: boolean;
};

function useBookingApi () {
  const [requestState, setRequestState] = useState<RequestState>({
    isUserLoading: false,
    isClubsLoading: false,
    isProductCategoriesLoading: false,
    isClubProductsLoading: false,
    isDigitalGoodsLoading: false,
    isProductsOrderSaving: false,
    isDigitalGoodsOrderSaving: false,
  });
  const ppsId = useMemo(() => config.PPS_ID, []);
  const { token } = useAdminToken();
  const request = useMemo(() => {
    const req = getRequestMethod(axios, token);
  
    return async <T>(stateValue: keyof RequestState, ...args: Parameters<typeof req>) => {
      setRequestState((prevState) => ({ ...prevState, [stateValue]: true }));
      
      try {
        return await req<T>(...args);
      } finally {
        setRequestState((prevState) => ({ ...prevState, [stateValue]: false }));
      }
    };
  }, [token]);

  const getUser = useCallback(() => {
    return request<User>('isUserLoading', 'get', '/users/me');
  }, [request]);

  const getClubs = useCallback(() => {
    return request<TClub[]>('isClubsLoading', 'get', '/clubs');
  }, [request]);

  const getProductCategories = useCallback((clubId: number) => {
    return request<ProductCategory[]>('isProductCategoriesLoading', 'get', `/clubs/${clubId}/product-categories`);
  }, [request]);

  const getClubProducts = useCallback((clubId: number) => {
    return request<TProduct[]>('isClubProductsLoading', 'get', `/clubs/${clubId}/products`);
  }, [request]);

  const getDigitalGoods = useCallback(() => {
    return request<DigitalGoodsResponse>('isDigitalGoodsLoading', 'get', 'digital-goods/showcase');
  }, [request]);

  const postProductsOrder = useCallback((clubId: number, body: TProductsOrderBody) => {
    return request<{ orderId: number }>(
      'isProductsOrderSaving',
      'post',
      `/clubs/${clubId}/product-orders`,
      { ...body, ppsId },
    );
  }, [request, ppsId]);

  const postDigitalGoodsOrder = useCallback((clubId: number, body: DigitalGoodsOrderBody, category?: string) => {
    return request<{ orderId: number; notAvailableList: number[]; total: number }>(
      'isDigitalGoodsOrderSaving',
      'post',
      `/clubs/${clubId}/buy-digital-goods${category ? `?category=${category}` : ''}`,
      { ...body, ppsId },
    );
  }, [request, ppsId]);

  return {
    request: {
      getUser,
      getClubs,
      getClubProducts,
      getDigitalGoods,
      getProductCategories,
      postProductsOrder,
      postDigitalGoodsOrder,
    },
    state: requestState,
  };
}

export default useBookingApi;
