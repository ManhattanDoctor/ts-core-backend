import { ValueTransformer } from 'typeorm';
import { DateUtil } from '@ts-core/common';
import * as _ from 'lodash';

export class TypeormDateEpochTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private static _instance: TypeormDateEpochTransformer;

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static get instance(): TypeormDateEpochTransformer {
        if (_.isNil(TypeormDateEpochTransformer._instance)) {
            TypeormDateEpochTransformer._instance = new TypeormDateEpochTransformer();
        }
        return TypeormDateEpochTransformer._instance;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from(item: number): Date {
        return !_.isNil(item) ? DateUtil.getDate(item) : null;
    }

    public to(item: Date): number {
        return !_.isNil(item) ? item.getTime() : null;
    }
}
