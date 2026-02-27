import {
    FilterableConditions,
    FilterableConditionType,
    FilterableSort,
    IFilterable,
    IPaginable,
    IPagination,
    ValidateUtil,
    ExtendedError,
    PromiseHandler,
    IsFilterableCondition,
    IFilterableCondition,
    IFilterableConditionValue,
    IFilterableProperties,
    FilterableConditionUnion
} from '@ts-core/common';
import { ValidatorOptions } from 'class-validator';
import { MoreThan, MoreThanOrEqual, LessThan, LessThanOrEqual, DataSource, DataSourceOptions, QueryFailedError, SelectQueryBuilder } from 'typeorm';
import { format } from 'date-fns';
import * as _ from 'lodash';
import * as fs from 'fs';

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

    public static getCondition(item: FilterableConditionType): string {
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
            case FilterableConditionType.INCLUDES_ALL:
                return '@>';
            case FilterableConditionType.INCLUDES_ONE_OF:
                return '&&';
            case FilterableConditionType.NULL:
                return 'IS NULL'
            case FilterableConditionType.NOT_NULL:
                return 'IS NOT NULL'
            default:
                throw new ExtendedError(`Invalid condition type ${item}`);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Query Static Methods
    //
    // --------------------------------------------------------------------------

    public static applyFilterProperties<U, T>(query: SelectQueryBuilder<U>, properties: IFilterableProperties<T>, alias?: string): SelectQueryBuilder<U> {
        TypeormUtil.applySort(query, properties?.sort, alias);
        TypeormUtil.applyConditions(query, properties?.conditions, alias);
        return query;
    }

    // TODO: deprecated, need to be removed in next version
    public static applyFilters<U, T>(query: SelectQueryBuilder<U>, properties: IFilterableProperties<T>, alias?: string): SelectQueryBuilder<U> {
        return TypeormUtil.applyFilterProperties(query, properties, alias);
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
            TypeormUtil.applyCondition(query, key, conditions[key], alias, key);
        }
        return query;
    }

    public static applyCondition<U, T>(query: SelectQueryBuilder<U>, name: keyof T, value: IFilterableConditionValue<T> | IFilterableCondition<T>, alias?: string, key?: string): SelectQueryBuilder<U> {
        if (_.isEmpty(name) || _.isNil(value)) {
            return query;
        }

        if (_.isEmpty(alias)) {
            alias = query.alias;
        }
        if (_.isEmpty(key)) {
            key = name.toString();
        }

        let property = `${alias}.${name.toString()}`;
        let conditionKey = `:${key}`;

        if (!IsFilterableCondition(value)) {
            query.andWhere(`${property} ${!_.isArray(value) ? `= ${conditionKey}` : `IN (:...${key})`}`, { [key]: value });
            return query;
        }

        let parameters = { [key]: value.value };
        switch (value.condition) {
            case FilterableConditionType.CONTAINS:
                property = `LOWER(${property})`;
                conditionKey = `LOWER(${conditionKey})`;
                break;
            case FilterableConditionType.INCLUDES_ALL:
            case FilterableConditionType.INCLUDES_ONE_OF:
                if (_.isArray(value.value) && !_.isEmpty(value.value)) {
                    let item = _.first(value.value);
                    if (_.isNumber(item) || typeof item === 'bigint') {
                        conditionKey += '::numeric[]';
                    } else if (_.isBoolean(item)) {
                        conditionKey += '::boolean[]';
                    } else {
                        conditionKey += '::varchar[]';
                    }
                }
                break;
            case FilterableConditionType.NULL:
            case FilterableConditionType.NOT_NULL:
                parameters = null;
                conditionKey = null;
                break;
        }

        let condition = TypeormUtil.getCondition(value.condition);
        let where = `${property} ${condition}`;
        if (!_.isEmpty(conditionKey)) {
            where += ` ${conditionKey}`;
        }
        switch (value.union) {
            case FilterableConditionUnion.OR:
                query.orWhere(where, parameters);
                break;
            default:
                query.andWhere(where, parameters);
        }
        return query;
    }

    public static async toPagination<U, V, T>(query: SelectQueryBuilder<U>, params: IPaginable<T>, transform: (item: U) => Promise<V>, isApplyFilterProperties: boolean = true): Promise<IPagination<V>> {
        if (isApplyFilterProperties) {
            TypeormUtil.applyFilterProperties(query, params);
        }

        let { pageSize, pageIndex } = params;
        query.skip(pageSize * pageIndex).take(pageSize);

        let [many, total] = await query.getManyAndCount();
        let pages = Math.ceil(total / pageSize);
        let items = await Promise.all(many.map(item => transform(item)));
        return { items, total, pageSize, pageIndex, pages };
    }

    public static async toFilterable<U, V, T>(query: SelectQueryBuilder<U>, params: IFilterable<T>, transform: (item: U) => Promise<V>, isApplyFilterProperties: boolean = true): Promise<Array<V>> {
        if (isApplyFilterProperties) {
            TypeormUtil.applyFilterProperties(query, params);
        }
        let items = await query.getMany();
        return Promise.all(items.map(item => transform(item)));
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

    public static async databaseClear(data: DataSource): Promise<void> {
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
        return error?.code === code;
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
