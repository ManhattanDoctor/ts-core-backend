import { ExtendedError } from '@ts-core/common/error';
import { ILogger } from '@ts-core/common/logger';
import * as _ from 'lodash';
import { SelectQueryBuilder, getRepository } from 'typeorm';

export class TypeormSelectQueryBuilder<T> extends SelectQueryBuilder<T> {
    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async find(): Promise<Array<T>> {
        return this.getMany();
    }

    public async findOne(id?: number): Promise<T> {
        if (!_.isNil(id)) {
            this.andWhere(`${this.alias}.id = :id`, { id });
        }
        return this.getOne();
    }

    public async findOneOrFail(id?: number): Promise<T> {
        let item = await this.findOne(id);
        if (_.isNil(item)) {
            throw new ExtendedError('Entity not found');
        }
        return item;
    }

    public sql(logger?: ILogger): TypeormSelectQueryBuilder<T> {
        let [query, parameters] = this.getQueryAndParameters();
        if (_.isNil(logger)) {
            logger = console;
        }
        logger.log('---------------------------------- SQL ----------------------------------');
        logger.log(`Query: "${query}"`);
        logger.log(`Parameters: "${parameters}"`);
        logger.log('-------------------------------------------------------------------------');
        return this;
    }

    public async sum(field: string): Promise<number> {
        this.select(`SUM(${field}) as sum`);
        let { item } = await this.getRawOne();
        return !_.isNil(item) ? Number(item) : NaN;
    }

    public with(...relations: Array<string>): TypeormSelectQueryBuilder<T> {
        const name = this.expressionMap.mainAlias.metadata.targetName;
        for (let item of relations) {
            if (name.includes('.')) {
                let items = name.split('.');

                this.leftJoinAndSelect(`${this.alias}.${items[0]}`, `${items[0]}`);
                for (let i = 0; i < items.length - 1; i++) {
                    let name = items[i];
                    let alias = items[i + 1];
                    if (!_.isEmpty(name) && !_.isEmpty(alias)) {
                        this.innerJoinAndSelect(`${name}.${alias}`, alias);
                    }
                }
                continue;
            }

            if (this.hasRelation(name, item)) {
                this.leftJoinAndSelect(`${this.alias}.${item}`, `${item}`);
                continue;
            }

            throw new ExtendedError(`Relation ${item} doesn't exists`);
        }
        return this;
    }
}
