
import { ILogger, LoggerLevel } from '@ts-core/common/logger';
import { ILoggerSettings } from './ILoggerSettings';
import { EnvSettingsStorage } from './EnvSettingsStorage';

export class ApplicationBaseSettings extends EnvSettingsStorage implements ILoggerSettings {
    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public logger?: ILogger;

    // --------------------------------------------------------------------------
    //
    //  Logger Properties
    //
    // --------------------------------------------------------------------------

    public get loggerLevel(): LoggerLevel {
        return this.getValue('LOGGER_LEVEL', LoggerLevel.ALL);
    }
}
