import { add, isAfter } from 'date-fns';
import retryPromise from 'promise-retry';
import * as Sentry from '@sentry/node';

import type { TStatus, IPrinterDriver } from './PrinterDriver';

type TProps = {
  printerDriver: IAutoCloseShift;
};

interface IAutoCloseShift {
  readonly status?: TStatus;

  closeShift(): Promise<void>;

  // Status changed event
  on(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  once(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  addListener(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
  removeListener(event: 'status-changed', listener: (status?: TStatus) => void): IPrinterDriver;
}

class AutoCloseShiftWorker {
  constructor ({ printerDriver }: TProps) {
    this.printerDriver = printerDriver;
    this.printerDriver.on('status-changed', this.onStatusChanged.bind(this));
  }

  private printerDriver: IAutoCloseShift;
  private interval: NodeJS.Timeout | undefined;

  private onStatusChanged (status?: TStatus) {
    if (status?.shiftStatus === 'opened') {
      if (!this.interval) this.autoCloseShift(status.shiftOpenedAt);
    } else {
      this.removeInterval();
    }
  }

  private autoCloseShift (shiftOpenedAt: Date) {
    const dateToCloseShift = add(shiftOpenedAt, { hours: 23, minutes: 55 });

    this.interval = setInterval(() => {
      if (isAfter(new Date(), dateToCloseShift)) {
        this.removeInterval();

        retryPromise((retry) => {
          return this.printerDriver
            .closeShift()
            .catch(retry);
        }, {
          retries: 5,
          minTimeout: 3000,
          factor: 1,
          maxTimeout: 3000,
        })
          .catch((err) => Sentry.configureScope((scope) => {
            const { shiftOpenedAt, shiftStatus } = this.printerDriver.status || {};
            scope.setExtras({
              dateToCloseShift: dateToCloseShift.toISOString(),
              shiftOpenedAt: shiftOpenedAt?.toISOString(),
              shiftStatus,
            });
            Sentry.captureException(err);
          }));
      }
    }, 1000);
  }

  private removeInterval () {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }
}

export type { IAutoCloseShift };
export default AutoCloseShiftWorker;
