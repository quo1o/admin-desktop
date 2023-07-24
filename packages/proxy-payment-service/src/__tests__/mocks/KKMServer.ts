import nock, { RequestBodyMatcher, Body } from 'nock';
import faker from 'faker';

import {
  RegisterCheckReq,
  RegisterCheckRes,
  CommonResponse,
  CorrectionCheckReq,
  CashBoxReq,
  ShiftReq,
  XReportReq,
  ListReq,
  ListRes,
  ListResItem,
} from '../../typings/kkm-server';

type MockRegisterCheckOptions = {
  status?: CommonResponse['Status'];
  isEvotorKKM?: boolean;
  RRNCode?: string;
  authorizationCode?: string;
};
function mockRegisterCheck (
  commandId: string,
  body: RegisterCheckReq,
  { status = 0, isEvotorKKM = false, RRNCode, authorizationCode }: MockRegisterCheckOptions = {},
) {
  const response: RegisterCheckRes = {
    ...generateCommonResponse(status),
    SessionCheckNumber: faker.random.number({ min: 1 }),
    URL: faker.internet.url(),
    QRCode: faker.random.alphaNumeric(10),
    Command: 'RegisterCheck',
    Cash: body.Cash || 0,
    ElectronicPayment: body.ElectronicPayment || 0,
    AdvancePayment: body.AdvancePayment || 0,
    Credit: body.Credit || 0,
    CashProvision: body.CashProvision || 0,
    Amount: body.ElectronicPayment || body.Cash || 0,
    Message: '',
    IdCommand: commandId,
    NumDevice: 0,
    ...(body.ElectronicPayment && !isEvotorKKM && {
      RezultProcessing: {
        CardNumber: faker.finance.creditCardNumber(),
        ReceiptNumber: faker.random.alphaNumeric(10),
        RRNCode: RRNCode || faker.random.alphaNumeric(10),
        AuthorizationCode: authorizationCode || faker.random.alphaNumeric(10),
        Slip: '',
        PrintSlipOnTerminal: false,
        Amount: body.ElectronicPayment || body.Cash || 0,
        CardHash: faker.random.alphaNumeric(10),
        TransDate: faker.date.recent().toISOString(),
        TerminalID: faker.random.alphaNumeric(10),
        Command: body.TypeCheck === 0 ? 'PayByPaymentCard' : 'ReturnPaymentByPaymentCard',
        Error: '',
        Warning: '',
        Message: '',
        Status: 0,
        IdCommand: commandId,
        NumDevice: 0,
      },
    }),
  };

  return mockKKMServerCommand(body, response);
}

function mockCorrection (body: CorrectionCheckReq, status: CommonResponse['Status'] = 0) {
  const response = generateCommonResponse(status);
  return mockKKMServerCommand(body, response);
}

function mockCashBoxAction (body: CashBoxReq, status: CommonResponse['Status'] = 0) {
  const response = generateCommonResponse(status);
  return mockKKMServerCommand(body, response);
}

function mockPrintZReport (body: ShiftReq, status: CommonResponse['Status'] = 0) {
  const response = generateCommonResponse(status);
  return mockKKMServerCommand(body, response);
}

function mockPrintXReport (body: XReportReq, status: CommonResponse['Status'] = 0) {
  const response = generateCommonResponse(status);
  return mockKKMServerCommand(body, response);
}

function mockList (body: ListReq, devices: ListResItem[] = []) {
  const response: ListRes = {
    ListUnit: devices,
    Command: 'List',
    Error: '',
    Warning: '',
    Message: '',
    Status: 0,
    IdCommand: body.IdCommand,
  };

  return mockKKMServerCommand(body, response);
}

function generateCommonResponse (status: CommonResponse['Status']): CommonResponse {
  return {
    Status: status,
    CheckNumber: faker.random.number({ min: 1 }),
    SessionNumber: faker.random.number({ min: 1 }),
    LineLength: faker.random.number({ min: 1 }),
    Error: status === 1 ? faker.lorem.words() : '',
    Warning: '',
    Message: '',
  };
}

function mockKKMServerCommand <R1 extends RequestBodyMatcher, R2 extends Body> (req: R1, res: R2) {
  return nock('http://localhost:5893')
    .post('/Execute', req)
    .reply(200, res);
}

export { mockRegisterCheck, mockCorrection, mockCashBoxAction, mockPrintXReport, mockPrintZReport, mockList };
