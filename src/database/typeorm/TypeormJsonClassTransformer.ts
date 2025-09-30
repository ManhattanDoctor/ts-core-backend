import { ValueTransformer } from "typeorm";
import { TransformUtil } from "@ts-core/common";
import { TypeormJsonTransformer } from "./TypeormJsonTransformer";
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

    public from(item: string): T {
        return this.fromTransform(TypeormJsonTransformer.from(item));
    }

    public to(item: T): string {
        return TypeormJsonTransformer.to(this.toTransform(item));
    }
}

export type ClassToTransform<T> = (item: T) => any;
export type ClassFromTransform<T> = (item: any) => T;