import { AxiosInstance, AxiosResponse } from 'axios';
import { TSubjectSign } from '@winstrike/pps-typings/printer';
import { DigitalGood } from '../../../typings/digital-goods';
import { S3Config } from '../../../typings/images';
import { TProduct } from '../../../typings/products';

function getSubjectSignName (subjectSign: TSubjectSign) {
  const names = [null,
    'Товар',
    'Подакцизный товар',
    'Работа',
    'Услуга',
    'Ставка азартной игры',
    'Выигрыш азартной игры',
    'Лотерейный билет',
    'Выигрыш лотереи',
    'Предоставление РИД',
    'Платёж или Выплата',
    'Агентское вознаграждение',
    'Составной предмет расчёта',
    'Иной предмет расчёта',
    'Имущественное право',
    'Внереализационный доход',
    'Страховые взносы',
    'Торговый сбор',
    'Курортный сбор',
  ];

  return names[subjectSign];
}

/**
 * @deprecated setIsLoading
 */
function getRequestMethod (
  axiosInstance: AxiosInstance,
  token: string | null,
  setIsLoading?: (value: boolean) => void,
) {
  return async <R = any, D = any, P = any> (
    method: 'get' | 'post' | 'patch' | 'delete' | 'put',
    url: string,
    data?: D,
    params?: P,
  ) => {
    if (setIsLoading) setIsLoading(true);
  
    let result: AxiosResponse<R>;
    try {
      if (method === 'get' || method === 'delete') {
        result = await axiosInstance.get(url, { params, headers: getHeaders(token) });
      } else {
        result = await axiosInstance.post(url, data, { params, headers: getHeaders(token) });
      }
    } finally {
      if (setIsLoading) setIsLoading(false);
    }
  
    return result.data;
  };
}

function getHeaders (token: string | null) {
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

const convertDigitalGoodsToProducts = (
  diigtalGoods: DigitalGood[],
  s3: S3Config & { bucket: string },
  digitalGoodCategoryToId: Record<string, number>,
): TProduct[] => diigtalGoods.map(dg => ({
  id: dg.id,
  categoryId: dg.category ? digitalGoodCategoryToId[dg.category] : 1,
  name: dg.name,
  priceInCents: dg.price * 100,
  subjectSign: 4,
  // That sucks, but now not necessary to use dynamic tax
  tax: '20%',
  config: { s3: { cloudfrontUrl: s3.cloudfrontUrl } },
  maxProductCount: 1,
  ...(dg.image && { image: { key: dg.image, bucket: s3.bucket, width: 57, height: 80 } }),
}));

export { getSubjectSignName, getRequestMethod, convertDigitalGoodsToProducts };
