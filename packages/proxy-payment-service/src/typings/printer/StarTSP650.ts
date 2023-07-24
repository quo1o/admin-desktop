import { TSubjectSign, TCheckText, TCorrectionDocumentDate } from '@winstrike/pps-typings/printer';

import { TMethodSign, TDocType } from '.';

type TTaxes = [1 | 0, 1 | 0, 1 | 0, 1 | 0, 1 | 0, 1 | 0];

type TSetHeaderParams = {
  text_list: TCheckText;
};

type TCheckItem = {
  name: string; // Тестовый Товар
  count: number; // 1
  price: number; // 5100
  taxes:  TTaxes; // [<20%>, <10%>, <20/120>, <10/110>, <0%>, <Без НДС>]
  subjectSign: TSubjectSign; // 4
  methodSign?: TMethodSign; // 4
  addAttr?: string; // Дополнительный атрибут предмета расчёта
  itemCode?: string; // 02019999999999
  supplierTaxId?: string; // 779999999999
  originCode?: string; // RU
  customDeclNum?: string; // #736
  excise?: number; // 100.11
  measureUnit?: string; // Баррели
  supplierName?: string; // Тестовый поставщик
  supplierTelNum?: string; // +78008888888
  transferOpTelNum?: string; // +77007777777
  payAgentOp?: string; // Тестовая операция
  payAgentTelNum?: string; // +76001111111
  processingOpTelNum?: string; // +75002222222
  transferOpName?: string; // Тестовый оператор перевода
  transferOpAddr?: string; // Тестовый адрес оператора перевода
  transferOpTaxId?: string; // 771111111111
};

type TCheckParams = {
  docType: TDocType;
  userName?: string;
  items: TCheckItem[];
  text?: TCheckText;
  qrSize?: number; // 5
  qrErrLvl?: number; // 3
  qrAlign?: number; // 1
  qrData?: string; // Какой-то текст
  cash?: number; // 0.00
  emoney?: number; // 0.00
  advance?: number; // 5100.00
  credit?: number; // 0.00
  other?: number; // 0.00
};

type TCorrectionOperationType =
  | 1  // Приход
  | 3; // Расход

type TCorrectionType =
  | 0  // Самостоятельно
  | 1; // По предписанию

type TTaxSums =
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | [number, number, number, number, number]
  | [number, number, number, number, number, number];

type TCorrectionParams = {
  operationType: TCorrectionOperationType;
  cash?: number; // 0.00
  emoney?: number; // 0.00
  advance?: number; // 5100.00
  credit?: number; // 0.00
  other?: number; // 0.00
  taxSum: TTaxSums; // [0.00, 0.00, 0.00, 4.00, 5.00, 6.00]
  correctionType: TCorrectionType;
  correctionName: string; // осн. корр. (имя документа, объясняющего коррекцию)
  correctionDate: TCorrectionDocumentDate; // [17, 11, 27]
  correctionNum: string; // номер документа, объясняющего коррекцию
};

type TCashIncomeOutcome = { summ: number };

type TStatus = {
  info: {
    shift: {
      dt_closed: string; // 1601-01-01T00:00:00.000Z
      dt_open: string; // 2020-05-06T17:05:56.280Z
      status: 'open' | 'closed';
    };
    fiscal: {
      fiscal_doc_sign: number; // 4227111588
      kkt_reg_num: string; // 0000012121027529
      fiscal_doc_num: number; // 1
      tax_system: Array<'OSN'>; // ['OSN']
      inn: string; // 7728240240
      pos_address: string;
      kkt_serial: string; // 199031008599
      status: 'fiscal';
      dt_fiscal: string;// 2020-04-11T14:03:00.000Z
      inn_cashier: string;
    };
    fn: {
      current_doc_code: number; // 0
      firmware: string; // fn debug V 2.12
      current_doc_details: string;
      warning_details: string;
      dt_last_operation: string; // 2020-05-06T17:10:00.000Z
      registration_left: number; // 29
      registration_count: number; // 1
      dt_valid_till: string; // 2021-07-25T00:00:00.000Z
      status_code: number; // 3
      status_details: string;
      firmware_type: 'debug';
      last_doc_num: number; // 35
      warning_flag: 0 | 1;
    };
    counters: {
      drawer_cash: string; // 200.00
    };
    ofd: {
      is_reading_ofd: boolean; // false
      is_wating_for_command_response: boolean; // false
      has_ofd_command: boolean; // false
      first_message_num: number; //0
      connect_code: number; // 1
      connect_details: string;
      is_connect_changed: boolean; // false
      is_connected: boolean; // true
      has_message_to_send: boolean; // false
      message_count: number; // 0
      is_waiting_for_response: boolean; // false
      connect_string: string; // ofdt.platformaofd.ru
      status: 'ok';
    };
    tech: {
      datetime: string; // 2020-05-07T16:21:10.280Z
      error_code: 0;
      error_details: string;
      firmware: string; // 4.4.19.15
      status: 'ok';
    };
  };
  status: 'ok';
};

type TError = {
  status: 'error';
  errorCode: number;
  errorText: string;
};

export type {
  TStatus,
  TError,
  TSetHeaderParams,
  TCheckParams,
  TCheckItem,
  TTaxes,
  TCorrectionParams,
  TCashIncomeOutcome,
  TTaxSums,
  TCorrectionOperationType,
  TCorrectionType,
};
