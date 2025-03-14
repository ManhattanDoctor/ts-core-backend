import { ValueTransformer } from "typeorm";
import { TypeormJsonTransformer } from "./TypeormJsonTransformer";
import { TransformUtil } from "@ts-core/common";
import * as _ from 'lodash';

export class TypeormJsonClassTransformer<T> implements ValueTransformer {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected toTransform: ClassToTransform<T>;
    protected fromTransform: ClassFromTransform<T>;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(from: ClassFromTransform<T>, to?: ClassToTransform<T>) {
        this.fromTransform = from;
        if (_.isNil(to)) {
            this.toTransform = TransformUtil.fromClass<T>;
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public from(item: string): Array<T> {
        let value = TypeormJsonTransformer.from<Array<any>>(item);
        return !_.isNil(value) ? value.map(this.fromTransform) : null;
    }

    public to(item: Array<T>): string {
        return TypeormJsonTransformer.to(item.map(this.toTransform));
    }
}

export type ClassToTransform<T> = (item: any) => T;
export type ClassFromTransform<T> = (item: T) => any;