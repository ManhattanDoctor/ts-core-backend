export interface IDatabaseSettings {
    readonly databaseHost: string;
    readonly databasePort: number;
    readonly databaseName: string;
    readonly databaseUserName: string;
    readonly databaseUserPassword: string;

    readonly databaseUri?: string;
    readonly databaseSslCa?: string;
    readonly databaseSslСert?: string;
}
