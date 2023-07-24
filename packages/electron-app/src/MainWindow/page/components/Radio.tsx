import { h, ComponentChildren } from 'preact';
import { Ref } from 'react';
import styled from 'styled-components';
import { useCallback } from 'preact/hooks';
import { forwardRef } from 'preact/compat';

type TProps<V extends string | number> = {
  className?: string;
  id?: string;
  name: string;
  value: V;
  isChecked?: boolean;
  isDefaultChecked?: boolean;
  label: ComponentChildren;
  onInput?: (value: V) => void;
};

const Radio = <V extends string | number> ({
  className,
  id,
  name,
  value,
  isChecked,
  isDefaultChecked,
  label,
  onInput,
}: TProps<V>,
ref: Ref<HTMLInputElement>) => {
  // In fact type of event is 'h.JSX.TargetedEvent<HTMLInputElement, Event>'
  // Use React type for compatibility with styled-components
  const handleInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    const valueAsNumber = parseFloat(value);
    if (onInput) onInput(!Number.isNaN(valueAsNumber) ? valueAsNumber as V : value as V);
  }, [onInput]);

  return (
    <Container className={className}>
      <Input
        ref={ref}
        id={id}
        name={name}
        value={value}
        onInput={onInput && handleInput}
        checked={isChecked}
        defaultChecked={isDefaultChecked}
      />
      <span>{label}</span>
    </Container>
  );
};

const RadioWithForwardRef =
  forwardRef(Radio) as <V extends string | number>(p: TProps<V> & { ref?: Ref<HTMLInputElement> }) => JSX.Element;

const Container = styled.label`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Input = styled.input.attrs(() => ({ type: 'radio' }))`
  width: 15px;
  height: 15px;
  margin: 0 5px 0 0;

  &:focus {
    box-shadow: none;
  }
`;

export default RadioWithForwardRef;
