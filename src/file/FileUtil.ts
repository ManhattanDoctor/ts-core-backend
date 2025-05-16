import { PromiseHandler } from '@ts-core/common';
import { createHash, BinaryToTextEncoding } from 'crypto';
// import { access } from 'node:fs/promises';
import axios from 'axios';
import * as fs from 'fs';
import * as _ from 'lodash';

export class FileUtil {
    // --------------------------------------------------------------------------
    //
    // 	Exists
    //
    // --------------------------------------------------------------------------

    public static async isExists(path: string, mode?: number): Promise<boolean> {
        // await access(path, mode)
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

    public static remove(path: string): Promise<void> {
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

    public static read(path: string, encoding: BufferEncoding): Promise<string> {
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

    public static save<T>(path: string, data: T, encoding: BufferEncoding): Promise<T> {
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

    public static saveSync<T>(path: string, data: T, encoding: BufferEncoding): T {
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

    public static directoryCreate(path: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void> {
        let promise = PromiseHandler.create();
        fs.mkdir(path, options, error => {
            if (!_.isNil(error)) {
                promise.reject(error.message);
            } else {
                promise.resolve();
            }
        });
        return promise.promise;
    }

    public static async directoryCreateIfNeed(path: string, options?: fs.Mode | fs.MakeDirectoryOptions): Promise<void> {
        if (!await FileUtil.isExists(path)) {
            await FileUtil.directoryCreate(path, options);
        }
    }

    // --------------------------------------------------------------------------
    //
    // 	Hash
    //
    // --------------------------------------------------------------------------

    public static async hashByUrl(url: string, algorithm?: string, digest?: BinaryToTextEncoding): Promise<string> {
        if (_.isNil(algorithm)) {
            algorithm = 'md5';
        }
        if (_.isNil(digest)) {
            digest = 'hex';
        }
        let { data } = await axios.get(url, { responseType: 'arraybuffer' });
        return createHash(algorithm).update(data).digest(digest);
    }

    public static async hashByPath(path: string, algorithm?: string, digest?: BinaryToTextEncoding): Promise<string> {
        if (_.isNil(algorithm)) {
            algorithm = 'md5';
        }
        if (_.isNil(digest)) {
            digest = 'hex';
        }
        let file = await FileUtil.read(path, 'binary')
        return createHash(algorithm).update(file).digest(digest);
    }
}
