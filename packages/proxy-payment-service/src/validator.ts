import { TConfig, TCheckParams, TCheckItem, TCorrectionParams } from '@winstrike/pps-typings/printer';
import { TCurrency } from '@winstrike/pps-typings/terminal';

import { getErrorText } from './helpers';
import { taxes } from './tax';

const paymentMethods = ['cash', 'card'] as const;

function validateConfigure ({ headerText, cashierName }: TConfig) {
  if (headerText) {
    const error = validateTextList('headerText', headerText);
    if (error) return Promise.reject(error);
  }
  if (cashierName) {
    const isValid = /^[а-яё]+\s[а-яё]\.[а-яё]\.$/i.test(cashierName);
    if (!isValid) return Promise.reject('invalid cashier name');
  }
  return Promise.resolve();
}

function validateCheckParams ({ type, items, paymentMethod, content }: TCheckParams) {
  const validTypes = ['income', 'return-of-income'];

  const errors: string[] = [];

  errors.push(...validateCheckItems(items));

  if (typeof type !== 'string' || !validTypes.includes(type)) {
    errors.push(getErrorText('type', `string with one of valid values: ${validTypes.join(', ')}`));
  }
  if (typeof paymentMethod !== 'string' || !paymentMethods.includes(paymentMethod)) {
    errors.push(getErrorText(
      'paymentMethod',
      `string with one of valid values: ${paymentMethods.join(', ')}`,
    ));
  }
  if (content) {
    const contentError = validateTextList('content', content);
    if (contentError) errors.push(contentError);
  }

  return new Promise<void>((resolve, reject) => {
    if (errors.length) reject(errors);
    resolve();
  });
}

function validateCheckItems (items: TCheckItem[]) {
  const validSubjectSigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const errors: string[] = [];

  items.forEach(({ name, count, price, tax, subjectSign }, i) => {
    const errorTextBeginning = `Item #${i + 1} `;

    if (typeof name !== 'string' || name.length === 0) {
      errors.push(errorTextBeginning + getErrorText('name', 'not empty string'));
    }
    if (typeof count !== 'number' || count < 1) {
      errors.push(errorTextBeginning + getErrorText('count', 'number more than zero'));
    }
    if (typeof price !== 'number' || price < 0 || price.toString().split('.')[1]?.length > 2) {
      errors.push(errorTextBeginning + getErrorText('price', 'positive number and contains 2 digit cents'));
    }
    if (typeof tax !== 'string' || !taxes.includes(tax)) {
      errors.push(errorTextBeginning + getErrorText(
        'tax',
        `string with one of valid values: ${taxes.join(', ')}`,
      ));
    }
    if (typeof subjectSign !== 'number' || !validSubjectSigns.includes(subjectSign)) {
      errors.push(errorTextBeginning + getErrorText(
        'subjectSign',
        `number with one of valid values: ${validSubjectSigns.join(', ')}`,
      ));
    }
  });

  return errors;
}

function validateTextList (fieldName: string, textList: string[]) {
  if (!Array.isArray(textList) || !textList.every(item => typeof item === 'string')) {
    return getErrorText(fieldName, 'array of strings');
  }
}

function validateCorrectionParams ({
  operationType, isPrescribed, amount, paymentMethod, tax, documentName, documentDate, documentNumber,
}: TCorrectionParams) {
  const validOperationTypes = ['income', 'outcome'];

  const errors: string[] = [];

  if (typeof operationType !== 'string' || !validOperationTypes.includes(operationType)) {
    errors.push(getErrorText('operationType', `string with one of valid values: ${validOperationTypes.join(', ')}`));
  }
  if (isPrescribed && typeof isPrescribed !== 'boolean') {
    errors.push(getErrorText('isPrescribed', 'boolean'));
  }
  const amountError = validateAmount(amount);
  if (amountError) errors.push(amountError);
  if (typeof paymentMethod !== 'string' || !paymentMethods.includes(paymentMethod)) {
    errors.push(getErrorText(
      'paymentMethod',
      `string with one of valid values: ${paymentMethods.join(', ')}`,
    ));
  }
  if (typeof tax !== 'string' || !taxes.includes(tax)) {
    errors.push(getErrorText('tax', `string with one of valid values: ${taxes.join(', ')}`));
  }
  if (typeof documentName !== 'string' || documentName.length === 0) {
    errors.push(getErrorText('documentName', 'not empty string'));
  }
  if (typeof documentNumber !== 'string' || documentNumber.length === 0) {
    errors.push(getErrorText('documentNumber', 'not empty string'));
  }
  if (
    !Array.isArray(documentDate)
    || documentDate.length !== 3
    || documentDate[0] < 1
    || (documentDate[1] < 1 || documentDate[1] > 12)
    || (documentDate[2] < 1 || documentDate[2] > 31)
  ) {
    errors.push(getErrorText(
      'documentDate',
      'array with three number values: year (more than 0), ' +
      'month (more than 0 and less than 13), ' +
      'month day (more than 0 and less than 32)',
    ));
  }

  return new Promise<void>((resolve, reject) => {
    if (errors.length) reject(errors);
    resolve();
  });
}

function validateAmount (amount: number) {
  if (typeof amount !== 'number' || amount < 0.01 || amount.toString().split('.')[1]?.length > 2) {
    return getErrorText('amount', 'number more than 0 and contains 2 digit cents');
  }
}

function validatePayParams (amount: number, currency: TCurrency) {
  const validCurrencies = ['RUB', 'USD', 'EUR'];

  const errors: string[] = [];

  if (typeof amount !== 'number' || amount < 0.01) {
    errors.push(getErrorText('amount', 'number more than 0.01'));
  }
  if (typeof currency !== 'string' || !validCurrencies.includes(currency)) {
    errors.push(getErrorText('currency', `string with one of valid values: ${validCurrencies.join(', ')}`));
  }

  return new Promise<void>((resolve, reject) => {
    if (errors.length) reject(errors);
    resolve();
  });
}

export { validateConfigure, validateCheckParams, validateCorrectionParams, validateAmount, validatePayParams };
