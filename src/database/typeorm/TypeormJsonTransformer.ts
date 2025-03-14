import { ValueTransformer } from 'typeorm';
import * as _ from 'lodash';

export class TypeormJsonTransformer implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    public static from<T>(item: string): T {
        return !_.isNil(item) ? JSON.parse(item) : null;
    }

    public static to<T>(item: T): string {
        return !_.isNil(item) ? JSON.stringify(item) : null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from<T>(item: string): T {
        return TypeormJsonTransformer.from(item);
    }

    public to<T>(item: T): string {
        return TypeormJsonTransformer.to(item);
    }
}
