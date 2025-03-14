import { ValueTransformer } from 'typeorm';
import * as _ from 'lodash';

export class TypeormJsonTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private static _instance: TypeormJsonTransformer;

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static get instance(): TypeormJsonTransformer {
        if (_.isNil(TypeormJsonTransformer._instance)) {
            TypeormJsonTransformer._instance = new TypeormJsonTransformer();
        }
        return TypeormJsonTransformer._instance;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from<T>(item: string): T {
        return !_.isNil(item) ? JSON.parse(item) : null;
    }

    public to<T>(item: T): string {
        return !_.isNil(item) ? JSON.stringify(item) : null;
    }
}
