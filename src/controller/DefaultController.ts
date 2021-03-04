import { validate, ValidationError, ValidatorOptions } from 'class-validator';
import * as _ from 'lodash';
import { ExtendedError } from '@ts-core/common/error';
import { ILogger, LoggerWrapper } from '@ts-core/common/logger';

export abstract class DefaultController<U, V> extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    protected constructor(logger: ILogger) {
        super(logger);
    }

    // --------------------------------------------------------------------------
    //
    //  Private Methods
    //
    // --------------------------------------------------------------------------

    protected async execute(params: U): Promise<V> {
        throw new ExtendedError('Method must be implemented', ExtendedError.HTTP_CODE_NOT_IMPLEMENTED);
    }

    protected async executeExtended(...params): Promise<V> {
        throw new ExtendedError('Method must be implemented', ExtendedError.HTTP_CODE_NOT_IMPLEMENTED);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async validateRequest(value: U): Promise<U> {
        let items: Array<ValidationError> = await validate(value, this.validatorOptions);
        if (!_.isEmpty(items)) {
            throw new ExtendedError(items.toString(), ExtendedError.HTTP_CODE_BAD_REQUEST, items);
        }
        return value;
    }

    protected get validatorOptions(): ValidatorOptions {
        return { validationError: { target: false } };
    }

    
    protected async validateResponse(value: V): Promise<V> {
        let items: Array<ValidationError> = await validate(value, this.validatorOptions);
        if (!_.isEmpty(items)) {
            throw new ExtendedError(items.toString(), ExtendedError.HTTP_CODE_INTERNAL_SERVER_ERROR, items);
        }
        return value;
    }
}
