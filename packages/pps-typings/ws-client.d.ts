import { TCurrency } from './terminal';
import { TConfig, TCheckParams, TCorrectionParams } from './printer';

type TServerMessageCommon <
  T extends WSClient.TServerMessageType,
  B extends WSClient.TServerMessageBody,
> = {
  operationId: string;
  type: T;
  body: B;
};

type TClientMessageCommon <
  T extends WSClient.TClientMessageType,
  S extends WSClient.TStatus | undefined = undefined,
  B extends WSClient.TClientMessageBody | WSClient.RegisterCheckSuccessBody | undefined = undefined,
> = S extends undefined ? {
  type: T;
  body: B;
} : B extends undefined ? {
  type: T;
  status: S;
} : {
  type: T;
  status: S;
  body: B;
}

declare namespace WSClient {
  type TServerMessageType =
  | 'configure-printer'
  | 'print-check'
  | 'print-correction'
  | 'pay'
  | 'refund'
  | 'cancel'
  | 'register-check';

  type TPayBody = {
    amount: number;
    currency: TCurrency;
  };
  type RefundBody = TPayBody & {
    invoiceId: string;
  };

  type TConfigurePrinterBody = TConfig;
  type TPrintCheckBody = TCheckParams;
  type TPrintCorrectionBody = TCorrectionParams;
  type TServerMessageBody = TPayBody | RefundBody | TConfigurePrinterBody | TPrintCheckBody | TPrintCorrectionBody;
  type RegisterCheckBody = TCheckParams;

  type TServerMessagePay = TServerMessageCommon<'pay', TPayBody>;
  type ServerMessageRefund = TServerMessageCommon<'refund', RefundBody>;
  type ServerMessageCancel = TServerMessageCommon<'cancel', RefundBody>;
  type TServerMessageConfigurePrinter = TServerMessageCommon<'configure-printer', TConfigurePrinterBody>;
  type TServerMessagePrintCheck = TServerMessageCommon<'print-check', TPrintCheckBody>;
  type TServerMessagePrintCorrection = TServerMessageCommon<'print-correction', TPrintCorrectionBody>;
  type ServerMessageRegisterCheck = TServerMessageCommon<'register-check', RegisterCheckBody>;

  type TServerMessage =
    | TServerMessagePay
    | ServerMessageRefund
    | ServerMessageCancel
    | TServerMessageConfigurePrinter
    | TServerMessagePrintCheck
    | TServerMessagePrintCorrection
    | ServerMessageRegisterCheck;

  type TClientMessageType = 'init' | 'error' | TServerMessageType;

  type TStatus = 'success' | 'error';

  type TInitBody = {
    ppsId: string;
  };
  type TPaySuccessBody = {
    invoiceId: string;
  };
  type RegisterCheckSuccessBody = {
    invoiceId?: string;
  };
  type TErrorBody = {
    message: string | string[];
    humanizedMessage?: string;
  };
  type TClientMessageBody = TInitBody | TPaySuccessBody | TErrorBody;

  type TClientMessageInit = TClientMessageCommon<'init', undefined, TInitBody>;
  type TClientMessagePaySuccess = TClientMessageCommon<'pay', 'success', TPaySuccessBody>;
  type ClientMessageRefundSuccess = TClientMessageCommon<'refund', 'success'>;
  type ClientMessageCancelSuccess = TClientMessageCommon<'cancel', 'success'>;
  type TClientMessageConfigurePrinterSuccess = TClientMessageCommon<'configure-printer', 'success'>;
  type TClientMessagePrintCheckSuccess = TClientMessageCommon<'print-check', 'success'>;
  type TClientMessageCorrectionCheckSuccess = TClientMessageCommon<'print-correction', 'success'>;
  type ClientMessageRegisterCheckSuccess = TClientMessageCommon<'register-check', 'success', RegisterCheckSuccessBody>;

  type TClientMessagePayError = TClientMessageCommon<'pay', 'error', TErrorBody>;
  type ClientMessageRefundError = TClientMessageCommon<'refund', 'error', TErrorBody>;
  type ClientMessageCancelError = TClientMessageCommon<'cancel', 'error', TErrorBody>;
  type TClientMessageConfigurePrinterError = TClientMessageCommon<'configure-printer', 'error', TErrorBody>;
  type TClientMessagePrintCheckError = TClientMessageCommon<'print-check', 'error', TErrorBody>;
  type TClientMessagePrintCorrectionError = TClientMessageCommon<'print-correction', 'error', TErrorBody>;
  type ClientMessageRegisterCheckError = TClientMessageCommon<'register-check', 'error', TErrorBody>;
  type TClientMessageError = TClientMessageCommon<'error', undefined, TErrorBody>;

  type TClientMessage =
    | TClientMessageInit
    | TClientMessagePaySuccess
    | ClientMessageRefundSuccess
    | ClientMessageCancelSuccess
    | TClientMessageConfigurePrinterSuccess
    | TClientMessagePrintCheckSuccess
    | TClientMessageCorrectionCheckSuccess
    | ClientMessageRegisterCheckSuccess
    | TClientMessagePayError
    | ClientMessageRefundError
    | ClientMessageCancelError
    | TClientMessageConfigurePrinterError
    | TClientMessagePrintCheckError
    | TClientMessagePrintCorrectionError
    | ClientMessageRegisterCheckError
    | TClientMessageError;
}

export = WSClient;
