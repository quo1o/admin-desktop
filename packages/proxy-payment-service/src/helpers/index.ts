import type { Readable } from 'stream';
import type { TCheckItem } from '@winstrike/pps-typings/printer';
import { log } from '../logger';
import HumanizedError from '../HumanizedError';
import { TErrorBody } from '@winstrike/pps-typings/ws-client';

function getErrorText (fieldName: string, message: string) {
  return `${fieldName} must be ${message}`;
}

function calculateTotal (items: TCheckItem[]) {
  return exponentialRound(items.reduce((acc, { count, price }) => acc + (price * count), 0), 2);
}

function stdoToConsole (stdout: Readable, stderr: Readable) {
  stdout.on('data', (data) => {
    // eslint-disable-next-line no-console
    log('log', data.toString());
  });

  stderr.on('data', (data) => {
    log('error', data.toString());
  });
}

function inTestEnvironment () {
  return process.env.NODE_ENV === 'test';
}

function exponentialRound (value: number, decimalCount: number) {
  return Number(`${Math.round(Number(`${value}e${decimalCount}`))}e-${decimalCount}`);
}

/**
 * 
 * @param number - like '0001', '000002'
 */
function incrementStringNumber (number: string) {
  const numberInt = parseInt(number, 10);

  if (isNaN(numberInt)) throw new Error('Can not parse number');

  const newNumberArray = (numberInt + 1).toString().split('');
  const maxLength = number.length;

  return new Array(maxLength).fill('').reduce<string>((acc, _, i) => {
    const index = newNumberArray.length - maxLength + i;
    if (index < 0) return `${acc}0`;
    return `${acc}${newNumberArray[index]}`;
  }, '');
}

function getErrorBody (error: Error | HumanizedError | string | string[]): TErrorBody {
  if (error instanceof HumanizedError) return { message: error.message, humanizedMessage: error.humanizedMessage };
  return { message: error instanceof Error ? error.message : error };
}

export {
  getErrorText,
  calculateTotal,
  stdoToConsole,
  inTestEnvironment,
  exponentialRound,
  incrementStringNumber,
  getErrorBody,
};
