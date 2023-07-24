import { h, FunctionComponent } from 'preact';
import { useCallback } from 'preact/hooks';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { TCorrectionParams } from '@winstrike/pps-typings/printer';

import usePaymentService from '../hooks/usePaymentService';
import RadioGroup from './RadioGroup';
import Radio from './Radio';
import Button from './Button';
import { confirm } from './ConfirmModal';
import Input from './Input';
import Select from './Select';
import Label from './Label';

type TProps = {
  className?: string;
};

type TFormData = Pick<
  TCorrectionParams,
  'operationType' | 'paymentMethod' | 'tax' | 'documentName' | 'documentNumber'
> & {
  isPrescribed: 'true' | 'false';
  amount: string;
  documentDate: {
    year: string;
    month: string;
    monthDay: string;
  };
};

const Correction: FunctionComponent<TProps> = () => {
  const { register, handleSubmit, reset } = useForm();

  const { postCorrection, isLoading } = usePaymentService();

  const onSubmit = useCallback(async (formData: TFormData) => {
    if (!(await confirm('Вы уверены, что хотите сделать коррекцию?'))) return;

    const correctionParams = convertFormDataToCorrectionParams(formData);

    try {
      await postCorrection(correctionParams);
    } catch (e) {
      toast(e.message, { type: 'error' });
      return;
    }

    reset();
  }, [postCorrection, reset]);

  const date = new Date();

  return (
    <Container onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="operationType">Тип операции</Label>
      <Select id="operationType" name="operationType" ref={register({ required: true })}>
        <option value="income">Приход</option>
        <option value="outcome">Расход</option>
      </Select>

      <Label htmlFor="isPrescribed-false">Тип коррекции</Label>
      <RadioGroupStyled direction="horizontal">
        <Radio
          id="isPrescribed-false"
          name="isPrescribed"
          ref={register}
          label="Самостоятельно"
          value="false"
          isDefaultChecked
        />
        <Radio
          id="isPrescribed-true"
          name="isPrescribed"
          ref={register}
          label="По предписанию"
          value="true"
        />
      </RadioGroupStyled>

      <Label htmlFor="amount">Сумма</Label>
      <Input
        id="amount"
        name="amount"
        ref={register({ required: true, min: 0.01 })}
        type="number"
        step="0.01"
        min="0.01"
        placeholder="100.50"
      />

      <Label htmlFor="paymentMethod">Способ оплаты</Label>
      <Select id="paymentMethod" name="paymentMethod" ref={register({ required: true })}>
        <option value="card">Карта</option>
        <option value="cash">Наличные</option>
      </Select>

      <Label htmlFor="tax">Налоговая ставка</Label>
      <Select id="tax" name="tax" ref={register({ required: true })}>
        <option value="20%">20%</option>
        <option value="10%">10%</option>
        <option value="20/120">20/120</option>
        <option value="10/110">10/110</option>
        <option value="0%">0%</option>
        <option value="Без НДС">Без НДС</option>
      </Select>

      <DocumentHeading>Документ, являющийся основанием для коррекции</DocumentHeading>

      <Label htmlFor="documentName">Имя документа</Label>
      <Input
        id="documentName"
        name="documentName"
        ref={register({ required: true })}
        type="text"
        placeholder="Акт о нарушении"
      />

      <Label htmlFor="documentNumber">Номер документа</Label>
      <Input
        id="documentNumber"
        name="documentNumber"
        ref={register({ required: true })}
        type="text"
        placeholder="001"
      />

      <Label>Дата (год, месяц, число)</Label>
      <DateInputs>
        <Input
          name="documentDate.year"
          ref={register({ required: true, min: date.getFullYear(), max: 2099 })}
          type="number"
          step="1"
          min={date.getFullYear()}
          max="2099"
          placeholder={date.getFullYear().toString()}
          title="Год"
        />
        <Input
          name="documentDate.month"
          ref={register({ required: true, min: 1, max: 12 })}
          type="number"
          step="1"
          min="1"
          max="12"
          placeholder={(date.getMonth() + 1).toString()}
          title="Месяц"
        />
        <Input
          name="documentDate.monthDay"
          ref={register({ required: true, min: 1, max: 31 })}
          type="number"
          step="1"
          min="1"
          max="31"
          placeholder={date.getDate().toString()}
          title="Число"
        />
      </DateInputs>

      <SubmitButton isDisabled={isLoading}>Печать</SubmitButton>
    </Container>
  );
};

function convertFormDataToCorrectionParams (formData: TFormData): TCorrectionParams {
  const { isPrescribed, amount, documentDate: { year, month, monthDay } } = formData;
  return {
    ...formData,
    isPrescribed: isPrescribed === 'true',
    amount: parseFloat(amount),
    documentDate: [parseInt(year.substr(2), 10), parseInt(month, 10), parseInt(monthDay, 10)],
  };
}

const Container = styled.form`
  display: grid;
  grid-template-columns: auto 1fr 90px;
  gap: 10px 20px;
`;

const RadioGroupStyled = styled(RadioGroup)`
  height: 44px;
`;

const DocumentHeading = styled.h4`
  font-size: 1.1rem;
  margin-top: 20px;
  margin-bottom: 10px;
  grid-column: 1 / 4;
`;

const DateInputs = styled.div`
  display: flex;
  margin: -5px;
  grid-column: 2 / 4;

  & > * {
    margin: 5px;
    flex-basis: 90px;

    &:first-child {
      flex-grow: 1;
    }
  }
`;

const SubmitButton = styled(Button).attrs({ type: 'submit' })`
  margin-top: 10px;
  grid-column: 3 / 4;
`;

export default Correction;
