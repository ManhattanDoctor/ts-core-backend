import { ITransportCommandOptions } from '@ts-core/common';

export interface ITransportAmqpRequestPayload<U = any> {
    id: string;
    name: string;
    request?: U;
    options: ITransportCommandOptions;
    isNeedReply: boolean;
}
