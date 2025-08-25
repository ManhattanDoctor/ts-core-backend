export interface IModeSettings {
    readonly mode: Mode;
    readonly isDemo: boolean;
    readonly isTest: boolean;
    readonly isProduction: boolean;
    readonly isDevelopment: boolean;
}

export enum Mode {
    DEMO = 'demo',
    TEST = 'test',
    PRODUCTION = 'production',
    DEVELOPMENT = 'development'
}
