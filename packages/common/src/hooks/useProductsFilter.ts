import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import Fuse from 'fuse.js';

type Product = {
  categoryId?: number | null;
};

export default function useProductsFilter <T extends Product> (products: T[] = []) {
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'null' | 'any'>('any');
  const [productNameDebounced] = useDebounce(productName, 200);
  const [productsOfCategory, setProductsOfCategory] = useState(products);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const fuse = useMemo(() => new Fuse(productsOfCategory, { keys: ['name'] }), [productsOfCategory]);

  const onProductNameChange = useCallback((value: string) => {
    setProductName(value);
  }, []);

  /**
   * @param {string} value Can be categoryId as string, 'null' or 'any' 
   */
  const onCategoryIdChange = useCallback((value: string) => {
    setCategoryId(parseInt(value, 10) || value as 'null' | 'any');
  }, []);

  useEffect(() => {
    const categoryIdForFilter = typeof categoryId === 'number' ? categoryId : null;
    const filteredProducts = categoryId !== 'any' &&
      products.filter(({ categoryId: cId }) => cId === categoryIdForFilter);
    setProductsOfCategory(filteredProducts || products);
  }, [categoryId, products]);

  useEffect(() => {
    if (productNameDebounced) {
      const searchedProducts = fuse.search(productNameDebounced).map(({ item }) => item);
      setFilteredProducts(searchedProducts);
    } else {
      setFilteredProducts(productsOfCategory);
    }
  }, [productNameDebounced, productsOfCategory, fuse]);

  return { productName, categoryId, onProductNameChange, onCategoryIdChange, filteredProducts };
}
