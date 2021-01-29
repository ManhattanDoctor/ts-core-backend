import { PromiseHandler } from '@ts-core/common/promise';
import * as _ from 'lodash';
import * as fs from 'fs';

export class FileUtil {
    // --------------------------------------------------------------------------
    //
    // 	Public Methods
    //
    // --------------------------------------------------------------------------

    public static async isExists(path: string): Promise<boolean> {
        let promise = PromiseHandler.create();
        fs.exists(path, value => {
            promise.resolve(value);
        });
        return promise.promise;
    }

    public static async remove(path: string): Promise<void> {
        let promise = PromiseHandler.create();
        fs.unlink(path, error => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve();
            }
        });
        return promise.promise;
    }

    public static async directoryCreate(path: string): Promise<void> {
        let promise = PromiseHandler.create();
        fs.mkdir(path, error => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve();
            }
        });
        return promise.promise;
    }

    public static async jsonRead<T = any>(path: string): Promise<T> {
        let promise = PromiseHandler.create();
        fs.readFile(path, 'utf8', (error, data) => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve(JSON.parse(data));
            }
        });
        return promise.promise;
    }

    public static async jsonSave<T = any>(path: string, data: T): Promise<T> {
        let promise = PromiseHandler.create();
        fs.writeFile(path, JSON.stringify(data, null, 4), 'utf8', error => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve(data);
            }
        });
        return promise.promise;
    }
}
