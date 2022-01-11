import { ValueTransformer } from 'typeorm';
import * as _ from 'lodash';

export class TypeormDecimalTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private static _instance: TypeormDecimalTransformer;

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static get instance(): TypeormDecimalTransformer {
        if (_.isNil(TypeormDecimalTransformer._instance)) {
            TypeormDecimalTransformer._instance = new TypeormDecimalTransformer();
        }
        return TypeormDecimalTransformer._instance;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public to(data: number): number {
        return data;
    }

    public from(data: string): number {
        return !_.isNil(data) ? parseFloat(data) : null;
    }
}
