import {
    FilterableConditions,
    FilterableConditionType,
    FilterableSort,
    IFilterable,
    IPaginable,
    IPagination,
    ObjectUtil,
    ValidateUtil,
    ExtendedError,
    PromiseHandler,
    IsFilterableCondition,
    IFilterableCondition,
    IFilterableConditionValue
} from '@ts-core/common';
import { ValidatorOptions } from 'class-validator';
import { DataSource, DataSourceOptions, QueryFailedError, SelectQueryBuilder } from 'typeorm';
import { MoreThan, MoreThanOrEqual, LessThan, LessThanOrEqual } from 'typeorm';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as _ from 'lodash';

export class TypeormUtil {
    // --------------------------------------------------------------------------
    //
    //  Constants
    //
    // --------------------------------------------------------------------------

    public static POSTGRE_FORIN_MAX = 10000;

    // --------------------------------------------------------------------------
    //
    //  Query Private Static Methods
    //
    // --------------------------------------------------------------------------

    private static getConditionByType(item: FilterableConditionType): string {
        switch (item) {
            case FilterableConditionType.EQUAL:
                return '=';
            case FilterableConditionType.MORE:
                return '>';
            case FilterableConditionType.MORE_OR_EQUAL:
                return '>=';
            case FilterableConditionType.LESS:
                return '<';
            case FilterableConditionType.LESS_OR_EQUAL:
                return '<=';
            case FilterableConditionType.CONTAINS:
            case FilterableConditionType.CONTAINS_SENSITIVE:
                return 'like';
            default:
                throw new ExtendedError(`Invalid condition type ${item}`);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Query Static Methods
    //
    // --------------------------------------------------------------------------

    public static applyFilters<U, T>(query: SelectQueryBuilder<U>, filters: IFilterable<T>): SelectQueryBuilder<U> {
        if (ObjectUtil.instanceOf(filters, ['conditions'])) {
            TypeormUtil.applyConditions(query, filters.conditions);
        }
        if (ObjectUtil.instanceOf(filters, ['sort'])) {
            TypeormUtil.applySort(query, filters.sort);
        }
        return query;
    }

    public static applySort<U, T>(query: SelectQueryBuilder<U>, sort: FilterableSort<T>, alias?: string): SelectQueryBuilder<U> {
        if (_.isNil(sort)) {
            return query;
        }
        if (_.isEmpty(alias)) {
            alias = query.alias;
        }
        for (let key of Object.keys(sort)) {
            query.addOrderBy(`${alias}.${key}`, sort[key] ? 'ASC' : 'DESC', 'NULLS LAST');
        }
        return query;
    }

    public static applyConditions<U, T>(query: SelectQueryBuilder<U>, conditions: FilterableConditions<T>, alias?: string): SelectQueryBuilder<U> {
        if (_.isNil(conditions)) {
            return query;
        }
        for (let key of Object.keys(conditions)) {
            query = TypeormUtil.applyCondition(query, key, conditions[key], alias);
        }
        return query;
    }

    public static applyCondition<U, T>(query: SelectQueryBuilder<U>, name: keyof T, value: IFilterableConditionValue<T> | IFilterableCondition<T>, alias?: string): SelectQueryBuilder<U> {
        if (_.isEmpty(name) || _.isNil(value)) {
            return query;
        }

        if (_.isEmpty(alias)) {
            alias = query.alias;
        }

        let key = name.toString();
        let property = `${alias}.${key}`;
        if (_.isArray(value)) {
            query.andWhere(`${property} IN (:...${key})`, { [key]: value });
            return query;
        }

        if (!IsFilterableCondition(value)) {
            query.andWhere(`${property} = :${key}`, { [key]: value });
            return query;
        }

        let conditionKey = `:${key}`;
        switch (value.condition) {
            case FilterableConditionType.CONTAINS:
                property = `LOWER(${property})`;
                conditionKey = `LOWER(${conditionKey})`;
                break;
        }

        let condition = this.getConditionByType(value.condition);
        query.andWhere(`${property} ${condition} ${conditionKey}`, { [key]: value.value });

        return query;
    }


    public static async toPagination<U, V, T>(
        query: SelectQueryBuilder<U>,
        params: IPaginable<T>,
        transform: (item: U) => Promise<V>
    ): Promise<IPagination<V>> {
        query = TypeormUtil.applyFilters(query, params);
        query = query.skip(params.pageSize * params.pageIndex).take(params.pageSize);

        let total = await query.getCount();
        let pages = Math.ceil(total / params.pageSize);

        let many = await query.getMany();
        let items = await Promise.all(many.map(item => transform(item)));
        return { items, pages, total, pageSize: params.pageSize, pageIndex: params.pageIndex };
    }

    public static async toFilterable<U, V, T>(query: SelectQueryBuilder<U>, params: IFilterable<T>, transform: (item: U) => Promise<V>): Promise<Array<V>> {
        query = TypeormUtil.applyFilters(query, params);

        let many = await query.getMany();
        return Promise.all(many.map(item => transform(item)));
    }

    // --------------------------------------------------------------------------
    //
    //  Public Static Methods
    //
    // --------------------------------------------------------------------------

    public static async clearEntities(data: DataSource): Promise<void> {
        for (let item of data.entityMetadatas) {
            await data.getRepository(item.name).query(`DELETE FROM ${item.tableName};`);
        }
    }

    public static async databaseClear(data: DataSource, name: string): Promise<void> {
        await data.synchronize(true);
    }

    public static isEntityId(id: any): boolean {
        if (!_.isNumber(id)) {
            id = parseInt(id, 10);
        }
        return !_.isNaN(id) ? id > 0 : false;
    }

    public static isUniqueError(error: QueryFailedError): boolean {
        return TypeormUtil.isErrorCode(error, TypeormPostgreError.UNIQUE_VIOLATION);
    }

    public static isSerializationError(error: QueryFailedError): boolean {
        return TypeormUtil.isErrorCode(error, TypeormPostgreError.SERIALIZATION_FAILURE);
    }

    public static async generateOrmConfig(config: DataSourceOptions, path: string): Promise<void> {
        let data = JSON.stringify(config);
        data = data.replace(/:\"migration\"/i, ':"src/migration"');
        let promise = PromiseHandler.create();
        fs.writeFile(path + '/ormconfig.json', data, error => {
            if (error) {
                promise.reject(error.toString());
            } else {
                promise.resolve();
            }
        });
        return promise.promise;
    }

    public static async validateEntity(entity: any, options?: ValidatorOptions, code?: number): Promise<void> {
        await ValidateUtil.validateAsync(entity, true, options, code);
    }

    // --------------------------------------------------------------------------
    //
    //  Private Methods
    //
    // --------------------------------------------------------------------------

    private static isErrorCode(error: any, code: any): boolean {
        return error && error.code === code;
    }
}

export const MoreThanDate = (date: Date, type: TypeormDateFormat) => MoreThan(format(date, type));
export const MoreThanOrEqualDate = (date: Date, type: TypeormDateFormat) => MoreThanOrEqual(format(date, type));
export const LessThanDate = (date: Date, type: TypeormDateFormat) => LessThan(format(date, type));
export const LessThanOrEqualDate = (date: Date, type: TypeormDateFormat) => LessThanOrEqual(format(date, type));

export enum TypeormDateFormat {
    DATE = 'yyyy-MM-dd',
    DATE_TIME = 'yyyy-MM-dd HH:MM:ss'
}

export enum TypeormPostgreError {
    UNIQUE_VIOLATION = '23505',
    SERIALIZATION_FAILURE = '40001'
}
