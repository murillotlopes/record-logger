import express, { Request, Response, NextFunction } from 'express'
import { ILog, Log } from './logger.model';

export class LoggerService {
  private apiName!: string;
  private app!: express.Application
  private morgan!: typeof import('morgan')
  private logRegister: boolean = false
  private logDev: boolean = false
  private errorCaptureFn!: (err: Error, req: Request, res: Response, next: NextFunction) => Promise<void>
  private recordLogginFn!: (req: Request, res: Response, next: NextFunction) => Promise<void>


  constructor(private loggerConfig: LoggerConfig) {
    this.initializeAttributes()
  }

  public initializeLogRecord(): void {

    if (this.logRegister) this.enableLoggingProduction()
    if (this.logDev) this.enableLoggingDevelopment()

  }

  public initializeLogErrorRecord(): void {
    if (this.logRegister) this.errorCapture()
  }

  private initializeAttributes(): void {
    const { app, morgan, apiName, logRegister, logDev, errorCaptureFnPersonalized, recordLogginFnPersonalized } = this.loggerConfig

    this.app = app
    this.errorCaptureFn = errorCaptureFnPersonalized || this.errorCaptureFnDefault.bind(this)
    this.recordLogginFn = recordLogginFnPersonalized || this.recordLogginFnDefault.bind(this)

    if (morgan) this.morgan = morgan
    if (apiName) this.apiName = apiName || process.env.API_NAME as string
    if (logRegister) this.logRegister = logRegister || !!process.env.LOG_REGISTER
    if (logDev && morgan) this.logDev = logDev || !!process.env.LOG_DEV

  }

  private enableLoggingDevelopment(): void {
    this.app.use(this.morgan('dev'))
  }

  private enableLoggingProduction(): void {
    this.app.use(this.recordLogginFn)
  }

  private errorCapture(): void {
    this.app.use(this.errorCaptureFn)
  }

  private async errorCaptureFnDefault(err: Error, req: Request, res: Response, next: NextFunction): Promise<void> {
    const start = process.hrtime()

    const durationInMilliseconds = this.getDurationInMilliseconds(start);
    const log: ILog = new Log({
      level: 'ERROR',
      method: req.method,
      when: new Date().toISOString(),
      duration: durationInMilliseconds,
      apiName: this.apiName,
      urlRequest: req.originalUrl,
      headers: req.headers,
      httpStatus: 500,
      stackTrace: err.stack
    });

    try {
      await log.save();
    } catch (error) {
      console.error('Erro ao salvar log de erro:', error);
    }

    res.status(500).json({ message: 'Internal Server Error' });
  }

  private async recordLogginFnDefault(req: Request, res: Response, next: NextFunction): Promise<void> {
    const start = process.hrtime();

    if (res.statusCode >= 500) {

      res.on('finish', async () => {
        const durationInMilliseconds = this.getDurationInMilliseconds(start);
        const log: ILog = new Log({
          level: this.getLogLevel(res.statusCode),
          method: req.method,
          when: new Date().toISOString(),
          duration: durationInMilliseconds,
          apiName: this.apiName,
          urlRequest: req.originalUrl,
          headers: req.headers,
          httpStatus: res.statusCode
        })

        try {
          await log.save();
        } catch (error) {
          throw error
        }
      })

    }

    next()
  }

  private getDurationInMilliseconds(start: [number, number]): number {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
  }

  private getLogLevel(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return 'INFO'
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'WARNING'
    } else if (statusCode >= 500) {
      return 'ERROR'
    }
    return 'INFO'
  }

}

export type LoggerConfig = {
  app: express.Application,
  morgan?: typeof import('morgan'),
  apiName?: string,
  logRegister?: boolean,
  logDev?: boolean,
  errorCaptureFnPersonalized?: (err: Error, req: Request, res: Response, next: NextFunction) => Promise<void>
  recordLogginFnPersonalized?: (req: Request, res: Response, next: NextFunction) => Promise<void>
}