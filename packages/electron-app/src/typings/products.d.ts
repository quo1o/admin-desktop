import { TSubjectSign, TTax } from '@winstrike/pps-typings/printer';

import { Image, S3Config } from './images';

type TProduct = {
  id: number;
  categoryId: number | null;
  name: string;
  priceInCents: number;
  subjectSign: TSubjectSign;
  tax: TTax;
  image?: Image;
  config?: { s3: S3Config };
  maxProductCount?: number;
};

type TProductWithCount = TProduct & { count: number };

type TProductWithCountAndTotal = TProductWithCount & { total: number };

type ProductCategory = {
  id: number;
  name: string;
};

export { TProduct, TProductWithCount, TProductWithCountAndTotal, ProductCategory };
