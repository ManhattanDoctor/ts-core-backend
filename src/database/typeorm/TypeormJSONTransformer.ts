import { ValueTransformer } from 'typeorm';
import * as _ from 'lodash';

export class TypeormJSONTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private static _instance: TypeormJSONTransformer;

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static get instance(): TypeormJSONTransformer {
        if (_.isNil(TypeormJSONTransformer._instance)) {
            TypeormJSONTransformer._instance = new TypeormJSONTransformer();
        }
        return TypeormJSONTransformer._instance;
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
