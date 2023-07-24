import { h, FunctionComponent } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import RadioGroup from './RadioGroup';
import Radio from './Radio';
import Button from './Button';
import { sendCashBoxAction } from '../printer';
import { confirm } from './ConfirmModal';

type TProps = {
  className?: string;
};

type TFormData = {
  type: TCashBoxActionType;
  amount: string;
};

const CashBox: FunctionComponent<TProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = useCallback(async (formData: TFormData) => {
    if (!(await confirm(getConfirmText(formData)))) return;

    const actionParams = convertFormDataToCashBoxActionParams(formData);

    setIsLoading(true);
    try {
      await sendCashBoxAction(actionParams);
    } catch (e) {
      toast(e, { type: 'error' });
      return;
    } finally {
      setIsLoading(false);
    }

    reset({ type: 'withdraw' });
  }, [reset]);

  return (
    <Container onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="type-withdraw">Тип операции</Label>
      <RadioGroupStyled direction="horizontal">
        <Radio
          id="type-withdraw"
          name="type"
          ref={register}
          label="Снятие"
          value="withdraw"
          isDefaultChecked
        />
        <Radio
          id="type-deposit"
          name="type"
          ref={register}
          label="Внесение"
          value="deposit"
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

      <SubmitButton isDisabled={isLoading}>Печать</SubmitButton>
    </Container>
  );
};

function getConfirmText ({ type, amount }: TFormData) {
  return `Вы уверены, что хотите ${type === 'withdraw' ? 'снять' : 'внести'} ${amount} руб.?`;
}

function convertFormDataToCashBoxActionParams (formData: TFormData): TCashBoxActionParams {
  const { amount } = formData;
  return {
    ...formData,
    amount: parseFloat(amount),
  };
}

const Container = styled.form`
  display: grid;
  grid-template-columns: auto 1fr 90px;
  gap: 10px 20px;
`;

const Label = styled.label`
  font-weight: 600;
  display: flex;
  align-items: center;
  grid-column: 1;
`;

const Input = styled.input`
  height: 44px;
  font-size: 1rem;
  grid-column: 2 / 4;
  border: 1px solid black;
  padding: 5px 10px;
  border-radius: 6px;
  background-color: #cf10600a;
`;

const RadioGroupStyled = styled(RadioGroup)`
  height: 44px;
`;

const SubmitButton = styled(Button).attrs({ type: 'submit' })`
  margin-top: 10px;
  grid-column: 3 / 4;
`;

export default CashBox;
