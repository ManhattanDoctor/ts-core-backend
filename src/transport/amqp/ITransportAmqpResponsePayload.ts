import { ExtendedError } from '@ts-core/common';

export interface ITransportAmqpResponsePayload<V = any> {
    id: string;
    response?: V | ExtendedError;
}
