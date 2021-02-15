import { ITransportEvent, TransportEvent } from '@ts-core/common/transport';
import { TransportInvalidDataError } from '@ts-core/common/transport/error';
import { TransformUtil, ValidateUtil } from '@ts-core/common/util';
import { Message } from 'amqplib';
import { IsOptional, IsString } from 'class-validator';
import * as _ from 'lodash';

export class TransportAmqpEventPayload<U = any> implements ITransportEvent<U> {
    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static parse<U>(message: Message): ITransportEvent<U> {
        let data = null;
        let content: string = null;
        try {
            content = message.content.toString('utf-8');
            data = TransformUtil.toJSON(content);
        } catch (error) {
            throw new TransportInvalidDataError(`Invalid payload: ${error.message}`, content);
        }

        let payload = TransformUtil.toClass<TransportAmqpEventPayload<U>>(TransportAmqpEventPayload, data);
        ValidateUtil.validate(payload);
        return new TransportEvent(payload.name, payload.data, payload.uid);
    }

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    @IsOptional()
    @IsString()
    public uid: string;

    @IsString()
    public name: string;

    @IsOptional()
    public data: U;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(event?: ITransportEvent<U>) {
        if (_.isNil(event)) {
            return;
        }
        this.uid = event.uid;
        this.name = event.name;
        this.data = event.data;
    }
}
