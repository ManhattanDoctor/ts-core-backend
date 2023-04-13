
import { ValidateUtil } from '@ts-core/common';
import { BeforeUpdate, BeforeInsert, BaseEntity } from 'typeorm';

export class TypeormValidableEntity extends BaseEntity {
    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    @BeforeUpdate()
    @BeforeInsert()
    public validate(): void {
        ValidateUtil.validate(this);
    }
}
