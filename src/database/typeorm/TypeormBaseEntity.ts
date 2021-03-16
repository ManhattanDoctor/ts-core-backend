import * as _ from 'lodash';
import { BaseEntity, BeforeInsert, BeforeUpdate, ObjectType } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { getConnection } from 'typeorm';
import { TypeormSelectQueryBuilder } from './TypeormSelectQueryBuilder';
import { ClassTransformOptions, classToPlain } from 'class-transformer';


export class TypeormBaseEntity<T = any> extends BaseEntity {
    // --------------------------------------------------------------------------
    //
    //  Static Properties
    //
    // --------------------------------------------------------------------------

    protected static alias: string;

    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static qb<T extends BaseEntity>(this: ObjectType<T>): TypeormSelectQueryBuilder<T> {
        let repository = getConnection().getRepository(this.name);
        let item = repository.createQueryBuilder(this['alias'] || _.camelCase(this.name));
        return new TypeormSelectQueryBuilder(item);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected copyProperties(entity: BaseEntity, properties: Array<string>): void {
        properties
            .filter(item => item !== 'id')
            .forEach(item => {
                if (!_.isNil(entity[item])) {
                    this[item] = entity[item];
                }
            });
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    @BeforeInsert()
    @BeforeUpdate()
    public async validate(): Promise<void> {
        await validateOrReject(this);
    }

    public async reload(...relations: Array<string>): Promise<void> {
        let base: any = this.constructor;
        let entity: BaseEntity = await base.getRepository().findOneOrFail(base.getId(this), { relations });
        let properties = Object.keys(base.getRepository()['metadata'].propertiesMap);
        this.copyProperties(entity, properties);
    }

    public toObject(options?: ClassTransformOptions): T {
        if (_.isNil(options)) {
            options = { excludePrefixes: ['__'] };
        }
        return classToPlain(this, options) as T;
    }
}
