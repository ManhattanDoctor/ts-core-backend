export interface IModeSettings {
    readonly mode: Mode;
    readonly isDemo: boolean;
    readonly isTesting: boolean;
    readonly isProduction: boolean;
    readonly isDevelopment: boolean;
}

export enum Mode {
    DEMO = 'demo',
    TESTING = 'testing',
    PRODUCTION = 'production',
    DEVELOPMENT = 'development'
}
