import { PromiseHandler } from '@ts-core/common';
import * as _ from 'lodash';
import * as fs from 'fs';

export class FileUtil {
    // --------------------------------------------------------------------------
    //
    // 	Exists
    //
    // --------------------------------------------------------------------------

    public static async isExists(path: string): Promise<boolean> {
        let promise = PromiseHandler.create();
        fs.exists(path, value => promise.resolve(value));
        return promise.promise;
    }

    public static isExistsSync(path: string): boolean {
        return fs.existsSync(path);
    }

    // --------------------------------------------------------------------------
    //
    // 	Remove
    //
    // --------------------------------------------------------------------------

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

    public static removeSync(path: string): void {
        fs.unlinkSync(path);
    }

    // --------------------------------------------------------------------------
    //
    // 	Read
    //
    // --------------------------------------------------------------------------

    public static async read(path: string, encoding: BufferEncoding): Promise<string> {
        let promise = PromiseHandler.create();
        fs.readFile(path, { encoding }, (error, data) => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve(data);
            }
        });
        return promise.promise;
    }

    public static readSync(path: string, encoding: BufferEncoding): string {
        return fs.readFileSync(path, { encoding });
    }

    // --------------------------------------------------------------------------
    //
    // 	Save
    //
    // --------------------------------------------------------------------------

    public static async save<T>(path: string, data: T, encoding: BufferEncoding): Promise<T> {
        let promise = PromiseHandler.create<T>();
        fs.writeFile(path, data as any, encoding, error => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve(data);
            }
        });
        return promise.promise;
    }
    
    public static async saveSync<T>(path: string, data: T, encoding: BufferEncoding): Promise<T> {
        fs.writeFileSync(path, data as any, encoding);
        return data;
    }

    // --------------------------------------------------------------------------
    //
    // 	JSON
    //
    // --------------------------------------------------------------------------

    public static async jsonRead<T = any>(path: string, encoding: BufferEncoding = 'utf8'): Promise<T> {
        return JSON.parse(await FileUtil.read(path, encoding));
    }

    public static async jsonSave<T = any>(path: string, data: T, encoding: BufferEncoding = 'utf8'): Promise<T> {
        await FileUtil.save(path, JSON.stringify(data, null, 4), encoding);
        return data;
    }

    // --------------------------------------------------------------------------
    //
    // 	Directory
    //
    // --------------------------------------------------------------------------

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
}
