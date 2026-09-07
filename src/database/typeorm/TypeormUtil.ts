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
    FilterableConditionUnion,
    FilterableDataType
} from '@ts-core/common';
import { ValidatorOptions } from 'class-validator';
import { MoreThan, MoreThanOrEqual, LessThan, LessThanOrEqual, DataSource, DataSourceOptions, QueryFailedError, SelectQueryBuilder, WhereExpressionBuilder, QueryBuilder, ObjectLiteral, Brackets } from 'typeorm';
import { format } from 'date-fns';
import * as _ from 'lodash';
import * as fs from 'fs';

export class TypeormUtil {
    // --------------------------------------------------------------------------
    //
    //  Drop Properties
    //
    // --------------------------------------------------------------------------

    // Отношения схемы, не принадлежащие расширениям. Партиции пропускаются: они уходят
    // вместе с родительской таблицей
    private static DROP_RELATIONS_QUERY = `
        SELECT n.nspname AS schema, c.relname AS name, c.relkind AS kind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
            AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
            AND NOT c.relispartition
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
    `;

    // Перечисления и домены схемы: типы, созданные миграциями, но не отношения
    private static DROP_TYPES_QUERY = `
        SELECT n.nspname AS schema, t.typname AS name
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = $1
            AND t.typtype IN ('e', 'd')
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')
    `;

    private static DROP_EXTENSIONS_QUERY = `SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname`;

    private static DROP_STATEMENTS: Record<string, string> = {
        m: 'DROP MATERIALIZED VIEW IF EXISTS',
        v: 'DROP VIEW IF EXISTS',
        r: 'DROP TABLE IF EXISTS',
        p: 'DROP TABLE IF EXISTS',
        S: 'DROP SEQUENCE IF EXISTS'
    };

    // Порядок важен: сначала зависимые объекты, затем таблицы, затем самостоятельные
    // последовательности — те, что принадлежат таблицам, уходят вместе с ними
    private static DROP_KINDS = ['m', 'v', 'r', 'p', 'S'];

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
        // Сортировка задаётся именем свойства, а не колонки: TypeORM сопоставит его сам,
        // и при пагинации с присоединениями ему нужно именно свойство — по имени колонки
        // он не находит метаданные и падает в createOrderByCombinedWithSelectExpression.
        // Имя всё равно проверяется: до запроса не должно доходить ничего, кроме простого
        // идентификатора
        Object.keys(sort).forEach(key => {
            TypeormUtil.validateColumnName(key);
            query.addOrderBy(`${alias}.${key}`, sort[key] ? 'ASC' : 'DESC', 'NULLS LAST');
        });
        return query;
    }

    public static applyConditions<U, T, Q extends SelectQueryBuilder<U> | WhereExpressionBuilder>(query: Q, conditions: FilterableConditions<T>, alias?: string): Q {
        if (_.isNil(conditions)) {
            return query;
        }

        let orKeys: Array<string> = new Array();
        Object.keys(conditions).forEach(key => {
            let value = conditions[key];
            if (IsFilterableCondition(value) && value.union === FilterableConditionUnion.OR) {
                orKeys.push(key);
            } else {
                TypeormUtil.applyCondition(query, key, value, alias, key);
            }
        });

        if (!_.isEmpty(orKeys)) {
            TypeormUtil.applyOrConditions(query, conditions, orKeys, alias);
        }
        return query;
    }

    public static applyCondition<U, T, Q extends SelectQueryBuilder<U> | WhereExpressionBuilder>(query: Q, name: keyof T, value: IFilterableConditionValue<T> | IFilterableCondition<T>, alias?: string, key?: string): Q {
        if (_.isEmpty(name) || _.isNil(value)) {
            return query;
        }

        if (_.isEmpty(alias) && query instanceof QueryBuilder) {
            alias = query.alias;
        }
        if (_.isEmpty(key)) {
            key = name.toString();
        }

        let property = `${alias}.${TypeormUtil.resolveColumnName(query, name.toString(), alias)}`;
        let conditionKey = `:${key}`;

        if (!IsFilterableCondition(value)) {
            return query.andWhere(`${property} ${!_.isArray(value) ? `= ${conditionKey}` : `IN (:...${key})`}`, { [key]: value }) as Q;
        }
        if (!_.isEmpty(value.path)) {
            property = TypeormUtil.toJsonProperty(property, value);
        }
        return TypeormUtil.addWhere(query, TypeormUtil.toCondition(property, conditionKey, key, value));
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

    // Сброс схемы, переживающий расширения базы. Штатный `synchronize(true)` и `schema:drop`
    // зовут PostgresQueryRunner.clearDatabase, который сносит всё, что видит в pg_views
    // и pg_tables текущей схемы, не различая объекты приложения и объекты расширений.
    // На локальной базе это незаметно — расширений там нет, — а в облачном PostgreSQL
    // расширения вроде pg_stat_statements включены принудительно, их view лежат в public,
    // и сброс падает первым же DROP: «cannot drop view pg_stat_statements_info because
    // extension pg_stat_statements requires it». Падает целиком, до единой правки.
    //
    // Здесь тот же сброс запросами к системному каталогу, но всё, что принадлежит расширению
    // (pg_depend.deptype = 'e'), пропускается. Вместе с этим отпадает нужда в списках
    // исключений вроде spatial_ref_sys и geography_columns у PostGIS: они принадлежат
    // расширению, и общий фильтр накрывает их сам, как накроет и любое другое расширение.
    //
    // Границы: обрабатывается одна схема (объекты за её пределами не трогаются), нужны права
    // владельца на удаляемые объекты, а CASCADE может утащить зависимые объекты из других
    // схем — ровно как и у штатного сброса
    public static async databaseDrop(data: DataSource, options?: ITypeormDatabaseDropOptions): Promise<ITypeormDatabaseDropResult> {
        if (data.options.type !== 'postgres') {
            throw new ExtendedError(`Unable to drop database: "${data.options.type}" is not supported, postgres only`);
        }
        let runner = data.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();
        try {
            let schema = options?.schema || data.options['schema'] || (await runner.query(`SELECT current_schema() AS name`))[0].name;

            let relations = await runner.query(TypeormUtil.DROP_RELATIONS_QUERY, [schema]);
            for (let kind of TypeormUtil.DROP_KINDS) {
                for (let item of relations.filter(item => item.kind === kind)) {
                    await runner.query(`${TypeormUtil.DROP_STATEMENTS[kind]} "${item.schema}"."${item.name}" CASCADE`);
                }
            }

            let types = await runner.query(TypeormUtil.DROP_TYPES_QUERY, [schema]);
            for (let item of types) {
                await runner.query(`DROP TYPE IF EXISTS "${item.schema}"."${item.name}" CASCADE`);
            }
            await runner.commitTransaction();

            let extensions = (await runner.query(TypeormUtil.DROP_EXTENSIONS_QUERY)).map(item => item.extname);
            return { schema, relations: relations.length, types: types.length, extensions };
        }
        catch (error) {
            await runner.rollbackTransaction();
            throw error;
        }
        finally {
            await runner.release();
        }
    }

    // Очистка базы: снести схему и создать её заново по сущностям. У postgres сброс идёт
    // через databaseDrop — иначе база с включённым расширением не очищается вовсе
    public static async databaseClear(data: DataSource): Promise<void> {
        if (data.options.type !== 'postgres') {
            await data.synchronize(true);
            return;
        }
        await TypeormUtil.databaseDrop(data);
        await data.synchronize(false);
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

    protected static applyOrConditions<U, T, Q extends SelectQueryBuilder<U> | WhereExpressionBuilder>(query: Q, conditions: FilterableConditions<T>, orKeys: Array<string>, alias?: string): void {
        query.andWhere(new Brackets(builder => orKeys.forEach(key => TypeormUtil.applyCondition(builder, TypeormUtil.resolveColumnName(query, key, alias), conditions[key], alias, key))));
    }

    // Условие уходит в SQL строкой, поэтому имя обязано быть простым идентификатором:
    // всё остальное — попытка подмешать выражение
    protected static validateColumnName(name: string): void {
        if (!/^\w+$/.test(name)) {
            throw new ExtendedError(`Invalid column name: ${name}`);
        }
    }

    protected static resolveColumnName<U>(query: SelectQueryBuilder<U> | WhereExpressionBuilder, name: string, alias?: string): string {
        TypeormUtil.validateColumnName(name);
        if (!(query instanceof QueryBuilder)) {
            return name;
        }
        let metadata = query.expressionMap?.mainAlias?.metadata;
        if (!_.isNil(alias) && alias !== query.alias) {
            let found = query.expressionMap.aliases.find(item => item.name === alias);
            if (!_.isNil(found?.metadata)) {
                metadata = found.metadata;
            }
        }
        let column = metadata?.findColumnWithPropertyName(name);
        return !_.isNil(column) ? column.databaseName : name;
    }

    protected static toJsonProperty<T>(property: string, value: IFilterableCondition<T>): string {
        if (!/^[\w.]+$/.test(value.path)) {
            throw new ExtendedError(`Invalid JSON path: ${value.path}`);
        }
        let parts = value.path.split('.');
        let isOnlyOne = parts.length === 1;
        let isIncludes = value.condition === FilterableConditionType.INCLUDES_ALL || value.condition === FilterableConditionType.INCLUDES_ONE_OF;
        property = `${property}${isOnlyOne ? '->' : '#>'}${isIncludes ? '' : '>'}${isOnlyOne ? `'${parts[0]}'` : `'{${parts.join(',')}}'`}`;
        if (isIncludes) {
            return property;
        }
        switch (value.type) {
            case FilterableDataType.NUMBER:
                property = `(${property})::numeric`;
                break;
            case FilterableDataType.DATE:
                property = `(${property})::timestamp`;
                break;
            case FilterableDataType.BOOLEAN:
                property = `(${property})::boolean`;
                break;
        }
        return property;
    }

    protected static toCondition<T>(property: string, conditionKey: string, key: string, value: IFilterableCondition<T>): ITypeormWhere | null {
        let parameters = { [key]: value.value };
        switch (value.condition) {
            case FilterableConditionType.CONTAINS:
                property = `LOWER(${property})`;
                conditionKey = `LOWER(${conditionKey})`;
                break;
            case FilterableConditionType.INCLUDES_ALL:
            case FilterableConditionType.INCLUDES_ONE_OF:
                if (!_.isArray(value.value) || _.isEmpty(value.value)) {
                    return null;
                }
                let item = _.first(value.value);
                let cast = _.isNumber(item) || typeof item === 'bigint' ? 'numeric' : _.isBoolean(item) ? 'boolean' : 'text';
                let isJsonb = !_.isEmpty(value.path) || _.isObject(item);

                if (value.condition === FilterableConditionType.INCLUDES_ONE_OF && isJsonb) {
                    if (_.isObject(item)) {
                        parameters[key] = JSON.stringify(value.value);
                        return { where: `EXISTS (SELECT 1 FROM jsonb_array_elements(${property}) AS elem, jsonb_array_elements(${conditionKey}::jsonb) AS target WHERE elem @> target)`, parameters, union: value.union };
                    }
                    let extract = `jsonb_array_elements_text(${property})`;
                    if (cast !== 'text') {
                        extract = `(${extract})::${cast}`;
                    }
                    return { where: `ARRAY(SELECT ${extract}) && ${conditionKey}::${cast}[]`, parameters, union: value.union };
                }

                if (isJsonb) {
                    conditionKey += '::jsonb';
                    parameters[key] = JSON.stringify(value.value);
                } else {
                    conditionKey += `::${cast}[]`;
                }
                break;
            case FilterableConditionType.NULL:
            case FilterableConditionType.NOT_NULL:
                parameters = null;
                conditionKey = null;
                break;
        }

        let where = `${property} ${TypeormUtil.getCondition(value.condition)}`;
        if (!_.isEmpty(conditionKey)) {
            where += ` ${conditionKey}`;
        }
        return { where, parameters, union: value.union };
    }

    protected static addWhere<U, Q extends SelectQueryBuilder<U> | WhereExpressionBuilder>(query: Q, where?: ITypeormWhere): Q {
        if (_.isNil(where)) {
            return query;
        }
        switch (where.union) {
            case FilterableConditionUnion.OR:
                query.orWhere(where.where, where.parameters);
                break;
            default:
                query.andWhere(where.where, where.parameters);
                break;
        }
        return query;
    }

    protected static isErrorCode(error: any, code: any): boolean {
        return error?.code === code;
    }
}

export interface ITypeormDatabaseDropOptions {
    // Схема, которую сбрасываем. По умолчанию — схема из настроек источника, а если её там
    // нет — current_schema()
    schema?: string;
}

export interface ITypeormDatabaseDropResult {
    schema: string;
    relations: number;
    types: number;
    // Расширения, оставленные нетронутыми: полезно показать в логе того, кто звал сброс
    extensions: Array<string>;
}

export interface ITypeormWhere {
    where: string;
    union?: FilterableConditionUnion;
    parameters?: ObjectLiteral;
}

export const MoreThanDate = (date: Date, type: TypeormDateFormat) => MoreThan(format(date, type));
export const MoreThanOrEqualDate = (date: Date, type: TypeormDateFormat) => MoreThanOrEqual(format(date, type));
export const LessThanDate = (date: Date, type: TypeormDateFormat) => LessThan(format(date, type));
export const LessThanOrEqualDate = (date: Date, type: TypeormDateFormat) => LessThanOrEqual(format(date, type));

export enum TypeormDateFormat {
    DATE = 'yyyy-MM-dd',
    DATE_TIME = 'yyyy-MM-dd HH:mm:ss'
}

export enum TypeormPostgreError {
    UNIQUE_VIOLATION = '23505',
    SERIALIZATION_FAILURE = '40001'
}
