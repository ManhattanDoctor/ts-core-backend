import { ValueTransformer } from 'typeorm';
import { TypeormJsonTransformer } from './TypeormJsonTransformer2';
import * as _ from 'lodash';

export class TypeormJsonArrayTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private static _instance: TypeormJsonArrayTransformer;

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static get instance(): TypeormJsonArrayTransformer {
        if (_.isNil(TypeormJsonArrayTransformer._instance)) {
            TypeormJsonArrayTransformer._instance = new TypeormJsonArrayTransformer();
        }
        return TypeormJsonArrayTransformer._instance;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from<T>(item: Array<string>): Array<T> {
        return !_.isNil(item) ? item.map(TypeormJsonTransformer.instance.from<T>) : null;
    }

    public to<T>(item: Array<T>): Array<string> {
        return !_.isNil(item) ? item.map(TypeormJsonTransformer.instance.to<T>)  : null;
    }
}
