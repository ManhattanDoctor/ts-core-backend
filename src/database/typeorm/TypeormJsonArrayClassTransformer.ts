import { ValueTransformer } from "typeorm";
import { TypeormJsonTransformer } from "./TypeormJsonTransformer";
import { TransformUtil } from "@ts-core/common";
import { ClassFromTransform, ClassToTransform } from "./TypeormJsonClassTransformer";
import * as _ from 'lodash';

export class TypeormJsonArrayClassTransformer<T> implements ValueTransformer {
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

    public from(item: Array<T>): Array<T> {
        let value = TypeormJsonTransformer.from<Array<T>>(item);
        return _.isArray(value) ? value.map(this.fromTransform) : null;
    }

    public to(item: Array<T>): Array<T> {
        return _.isArray(item) ? TypeormJsonTransformer.to(item.map(this.toTransform)) : null;
    }
}