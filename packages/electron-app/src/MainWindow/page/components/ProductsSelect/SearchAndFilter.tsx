import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import styled, { css } from 'styled-components';
import { useProductsFilter } from '@winstrike/admin-desktop-common-browser';

import { ProductCategory, TProduct } from '../../../../typings/products';
import Input from '../Input';
import Select from '../Select';
import Label from '../Label';

type Props = {
  categories: ProductCategory[];
  products: TProduct[];
  onSearchOrFilterCompleted: (filteredProducts: TProduct[]) => void;
};

const SearchAndFilter = ({ categories, products, onSearchOrFilterCompleted }: Props): JSX.Element => {
  const {
    productName, categoryId, filteredProducts, onProductNameChange, onCategoryIdChange,
  } = useProductsFilter(products);

  useEffect(() => {
    onSearchOrFilterCompleted(filteredProducts);
  }, [filteredProducts, onSearchOrFilterCompleted]);

  return (
    <Container>
      <SearchLabel htmlFor="productName">Поиск</SearchLabel>
      <SearchInput
        id="productName"
        name="productName"
        type="text"
        placeholder="Имя товара"
        onChange={({ target: { value } }) => onProductNameChange(value)}
        value={productName}
      />
      <CategoryLabel htmlFor="categoryId">Категория</CategoryLabel>
      <CategorySelect
        id="categoryId"
        name="categoryId"
        value={categoryId}
        onChange={({ target: { value } }) => onCategoryIdChange(value)}
      >
        <option value="any">Любая</option>
        <option value="null">Без категории</option>
        {categories.map(({ id, name }) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </CategorySelect>
    </Container>
  );
};

const Container = styled.div`
  display: grid;
  grid-template-columns: 50% 50%;
`;

const LabelStyle = css`
  grid-row: 1;
  margin-bottom: 5px;
`;

const InputStyle = css`
  grid-row: 2;
  width: 80%;
`;

const SearchStyle = css`
  grid-column: 1 / 2;
  margin-right: auto;
`;

const CategoryStyle = css`
  grid-column: 2 / 2;
  margin-left: auto;
`;

const SearchLabel = styled(Label)`
  ${SearchStyle}
  ${LabelStyle}
`;

const SearchInput = styled(Input)`
  ${SearchStyle}
  ${InputStyle}
`;

const CategoryLabel = styled(Label)`
  ${CategoryStyle}
  ${LabelStyle}
`;

const CategorySelect = styled(Select)`
  ${CategoryStyle}
  ${InputStyle}
`;

export default SearchAndFilter;
