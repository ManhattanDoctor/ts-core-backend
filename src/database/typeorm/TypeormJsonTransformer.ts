import { ValueTransformer } from 'typeorm';
import * as _ from 'lodash';

export class TypeormJsonTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    public static from<T>(item: string | T): T {
        return !_.isNil(item) ? _.isString(item) ? JSON.parse(item) : item : null;
    }

    public static to<T>(item: T): T {
        return !_.isNil(item) ? item : null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from<T>(item: string | T): T {
        return TypeormJsonTransformer.from(item);
    }

    public to<T>(item: T): T {
        return TypeormJsonTransformer.to(item);
    }
}
