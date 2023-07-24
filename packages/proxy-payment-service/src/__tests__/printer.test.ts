import nock from 'nock';
import { sub  } from 'date-fns';
import faker from 'faker';
import { WSServer } from '@winstrike/ws-test-helper';

// should be imported before all
import { PPS_OPTIONS, delay } from './helpers';

import type PrinterDriver from '../PrinterDriver';
import StarTSP650Driver from '../printer-drivers/StarTSP650Driver';
import { CHECK_PARAMS } from '../__fixtures__/check-params';
import { StarTSP650 } from '../request-mocks/one-time';
import AutoCloseShiftWorker from '../AutoCloseShiftWorker';
import { createHealthchecker } from '../PrinterDriverHealthchecker';

const FEATURES_OFF_OPTIONS = {
  address: PPS_OPTIONS.printer.address,
  shouldAutoCloseShift: false,
  shouldHealthcheck: false,
  shouldResetConfig: false,
};

afterAll(async () => {
  await WSServer.clean();
});

describe('cash flow methods', () => {
  const drivers = [
    [
      'StarTSP650',
      StarTSP650Driver,
      {
        status: () => StarTSP650.mockStatus('closed', new Date().toISOString()),
        withdraw: StarTSP650.mockCashOutcome,
        deposit: StarTSP650.mockCashIncome,
      },
    ],
  ] as const;

  afterAll(() => {
    nock.cleanAll();
  });

  describe.each(drivers)('for \'%s\' driver', (_, Driver, mock) => {
    const cashFlowCases = ['withdraw', 'deposit'] as const;

    let amount: number;
    let invalidAmount: number;

    beforeEach(() => {
      amount = parseFloat(faker.random.number({ min: 1, precision: 0.01 }).toFixed(2));
      invalidAmount = getInvalidAmount();
    });

    describe.each(cashFlowCases)('%s', (caseName) => {
      let printerDriver: PrinterDriver;
  
      beforeEach(async () => {
        printerDriver = new Driver(FEATURES_OFF_OPTIONS);
        await initPrinter(printerDriver, mock.status);
      });
  
      it(`should send request to ${caseName} cash`, async () => {
        const scope = mock[caseName](amount);
        await printerDriver[`${caseName}Cash` as 'withdrawCash' | 'depositCash'](amount);
    
        expect(scope.isDone()).toEqual(true);
      });
    
      it(`should return validation error if amount is invalid (${caseName})`, async () => {
        const scope = mock[caseName](invalidAmount);
        const promise = printerDriver[`${caseName}Cash` as 'withdrawCash' | 'depositCash'](invalidAmount);

        await expect(promise).rejects.toEqual('amount must be number more than 0 and contains 2 digit cents');
        expect(scope.isDone()).toEqual(false);
      });
    });

    function getInvalidAmount (): number {
      const invalidAmount = faker.random.number({ min: 1, precision: 0.001 });
      const cents = invalidAmount.toString().split('.')[1];
      if (!cents || cents.length !== 3) return getInvalidAmount();
      return invalidAmount;
    }
  });
});

describe('auto close shift', () => {
  let starTSP650Driver: StarTSP650Driver;

  beforeEach(() => {
    starTSP650Driver = new StarTSP650Driver({
      address: PPS_OPTIONS.printer.address,
      shouldResetConfig: false,
    });
    new AutoCloseShiftWorker({ printerDriver: starTSP650Driver });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should auto close shift if shift is opened', async () => {
    const shiftOpenedAt = sub(new Date(), { hours: 23, minutes: 54, seconds: 55 });

    // Sub 3 hours
    StarTSP650.mockStatus('open', shiftOpenedAt.toISOString());
    await starTSP650Driver.init();

    StarTSP650.mockZReport();
    StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());

    await delay(5000);

    expect(nock.isDone()).toEqual(true);
  }, 10000);

  it('should not auto close shift if shift is closed', async () => {
    const shiftOpenedAt = sub(new Date(), { hours: 23, minutes: 54, seconds: 55 });

    const firstStatusScope = StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());
    await starTSP650Driver.init();

    const zReportScope = StarTSP650.mockZReport();
    const secondStatusScope = StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());

    await delay(5000);

    expect(firstStatusScope.isDone()).toEqual(true);
    expect(zReportScope.isDone()).toEqual(false);
    expect(secondStatusScope.isDone()).toEqual(false);
  }, 10000);

  it('should not auto close shift if shift is closed manually', async () => {
    const shiftOpenedAt = sub(new Date(), { hours: 23, minutes: 54, seconds: 50 });

    const firstStatusScope = StarTSP650.mockStatus('open', shiftOpenedAt.toISOString());
    await starTSP650Driver.init();

    const firstZReportScope = StarTSP650.mockZReport();
    const secondStatusScope = StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());
    await starTSP650Driver.closeShift();

    const secondZReportScope = StarTSP650.mockZReport();
    const thirdStatusScope = StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());

    await delay(10000);

    expect(firstStatusScope.isDone()).toEqual(true);
    expect(firstZReportScope.isDone()).toEqual(true);
    expect(secondStatusScope.isDone()).toEqual(true);
    expect(secondZReportScope.isDone()).toEqual(false);
    expect(thirdStatusScope.isDone()).toEqual(false);
  }, 15000);

  it('should auto close shift if shift was closed and opened later', async () => {
    const shiftOpenedAt = sub(new Date(), { hours: 23, minutes: 54, seconds: 55 });

    StarTSP650.mockStatus('closed', new Date().toISOString());
    await starTSP650Driver.init();

    StarTSP650.mockPrintDoc();
    StarTSP650.mockStatus('open', shiftOpenedAt.toISOString());
    // Need to specify cashier name to avoid error during check printing
    await starTSP650Driver.configure({ cashierName: 'Иванов А.Б.' });
    await starTSP650Driver.printCheck(CHECK_PARAMS);

    StarTSP650.mockZReport();
    StarTSP650.mockStatus('closed', shiftOpenedAt.toISOString());

    await delay(5000);

    expect(nock.isDone()).toEqual(true);
  }, 10000);
});

describe('healthcheck', () => {
  it('should emit error if connection is lost', async () => {
    const starTSP650Driver = new StarTSP650Driver({
      address: PPS_OPTIONS.printer.address,
      healthchecker: { createHealthchecker },
      shouldResetConfig: false,
    });
    const mockError = jest.fn();

    starTSP650Driver.on('error', mockError);

    StarTSP650.mockStatus('closed', new Date().toISOString());
    await starTSP650Driver.init();

    // Mock first Healthchecker's attempt to get printer status
    StarTSP650.mockStatus('closed', new Date().toISOString());
    // Wait for Healthchecker and helpers/healthcheck function timeouts execution
    await delay(2200);

    // Mock second Healthchecker's attempt to get printer status
    StarTSP650.mockStatusError();
    // Wait for Healthchecker and helpers/healthcheck function timeouts execution
    await delay(2200);
    StarTSP650.mockStatusError();
    // Wait for helpers/healthcheck function timeout execution
    await delay(1200);
    StarTSP650.mockStatusError();
    // Wait for helpers/healthcheck function timeout execution
    await delay(1200);

    expect(nock.isDone()).toEqual(true);
    expect(mockError).toBeCalledTimes(1);
    expect(mockError).toBeCalledWith(new Error('Принтер не обнаружен'));
  }, 10000);
});

async function initPrinter (driver: PrinterDriver, mockStatus: () => void) {
  mockStatus();
  await driver.init();
}

describe('reset config', () => {
  it('should reset config after initialization', async () => {
    const starTSP650Driver = new StarTSP650Driver({
      address: PPS_OPTIONS.printer.address,
      shouldResetConfig: true,
    });

    StarTSP650.mockStatus('closed', new Date().toISOString());
    // In case of StarTSP650 'reset config' means clearing header text
    StarTSP650.mockSetHeader(['']);
    await starTSP650Driver.init();

    expect(nock.isDone()).toEqual(true);
  });
});
