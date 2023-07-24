import { inTestEnvironment } from './helpers';
import { reportError } from './error-reporter';

const DEFAULT_HEALTHCHECK_INTERVAL_MS = 15000;

type TProps = {
  healthcheck: THealthcheck;
  onHealthCheckFailed: TOnHealthcheckFailed;
  interval?: number;
};

type THealthcheck = () => Promise<void>;
type TOnHealthcheckFailed = (error: Error) => Promise<void> | void;

class Healthchecker {
  constructor ({ healthcheck, onHealthCheckFailed, interval = DEFAULT_HEALTHCHECK_INTERVAL_MS }: TProps) {
    this.healthcheck = healthcheck;
    this.onHealthCheckFailed = onHealthCheckFailed;
    this.interval = inTestEnvironment() ? 1000 : interval;
  }

  private healthcheck: THealthcheck;
  private onHealthCheckFailed: TOnHealthcheckFailed;
  private interval: number;
  private timeoutId: NodeJS.Timeout | undefined;

  start () {
    this.timeoutId = setTimeout(() => {
      this.removeTimeout();
      this.tryHealthcheck().catch(e => {
        reportError(e, '[Healthchecker]');
      });
    }, this.interval);
  }

  async tryHealthcheck () {
    try {
      await this.healthcheck();
      this.start();
    } catch (e) {
      await this.onHealthCheckFailed(e);
    }
  }

  stop () {
    this.removeTimeout();
  }

  private removeTimeout () {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
  }
}

export default Healthchecker;
