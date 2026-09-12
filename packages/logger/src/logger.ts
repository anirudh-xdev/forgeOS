import pino, { Logger as PinoLogger } from "pino";

export interface LoggerContext {
  projectId?: string;
  taskId?: string;
  agentId?: string;
  component?: string;
  [key: string]: unknown;
}

export class LoggerManager {
  private rootLogger: PinoLogger;

  constructor() {
    this.rootLogger = pino({
      level: process.env.LOG_LEVEL || "info",
      base: {
        service: "forgeos",
        env: process.env.NODE_ENV || "development",
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  public createLogger(context?: LoggerContext): PinoLogger {
    if (!context || Object.keys(context).length === 0) {
      return this.rootLogger;
    }
    return this.rootLogger.child(context);
  }

  public getRootLogger(): PinoLogger {
    return this.rootLogger;
  }
}

export const loggerManager = new LoggerManager();
export const logger = loggerManager.getRootLogger();
export const createLogger = (context?: LoggerContext) => loggerManager.createLogger(context);
