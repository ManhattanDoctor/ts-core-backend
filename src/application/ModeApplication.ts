import { IDestroyable, ILogger, LoggerWrapper } from '@ts-core/common';
import { IModeSettings } from '../settings';
import * as _ from 'lodash';

export class ModeApplication<T extends IModeSettings = IModeSettings> extends LoggerWrapper implements IDestroyable {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected _name: string;
    protected _settings: T;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    protected constructor(name: string, settings: T, logger?: ILogger) {
        super(logger);
        this._name = name;
        this._settings = settings;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async onApplicationBootstrap(): Promise<void> {
        let method = this.settings.isTest ? this.warn : this.log;
        method.call(this, `"${this.name}" service started in "${this.settings.mode}" mode`);
    }

    public destroy(): void {
        process.exit();
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get name(): string {
        return this._name;
    }

    public get settings(): T {
        return this._settings;
    }
}
