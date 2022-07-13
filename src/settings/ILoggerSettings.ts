import { ILogger, LoggerLevel } from '@ts-core/common';

export interface ILoggerSettings {
    readonly logger?: ILogger;
    readonly loggerLevel: LoggerLevel;
}
