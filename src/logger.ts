import { Inject, Injectable, InjectionToken, Optional } from "injection-js";

export const LogLevel = new InjectionToken<number>("LogLevel");

const LOG_LEVELS = {
  debug: 1,
  info: 2,
  notice: 4,
  warning: 8,
  error: 16,
  fatal: 32,
} as const;

@Injectable()
export class Logger {
  protected logMask: number = 60;

  constructor(
    @Inject(LogLevel) @Optional() logMask?: number,
  ) {
    if (logMask) {
      // tslint:disable-next-line:no-bitwise
      this.logMask = 0x3f & logMask;
    }
  }

  public log(level: keyof typeof LOG_LEVELS, domain: string, code: string, details?: any) {
    if (this.canLog(level)) {
      const args = details ? [ domain, code, details ] : [ domain, code ];

      // tslint:disable-next-line:no-console
      console.log(...args);
    }
  }

  protected canLog(level: keyof typeof LOG_LEVELS) {
    // tslint:disable-next-line:no-bitwise
    return LOG_LEVELS[level] & this.logMask;
  }
}
