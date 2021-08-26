import {retryPromise} from "./util";

export interface CachedItem {
    fetchTime: number;
    data: any;
}

function now(): number {
    var d = new Date();
    return d.getTime();
}

const clearCache = false;

function getMultiple(keys: string[], maxAge: number = 3600): Promise<any[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, function(result: any) {
            let resultArr = [];
            for (let key of keys) {
               if (key in result) {
                    let item = result[key] as CachedItem;
                    if (clearCache || (now() - item.fetchTime)/1000.0 >= maxAge) {
                        resultArr.push(undefined);
                    } else {
                        resultArr.push(item.data);
                    }
                } else {
                    resultArr.push(undefined);
                }
            }
            resolve(resultArr);
        })
    });
}

function get(key: string, maxAge: number = 3600): Promise<any> {
    return getMultiple([key], maxAge).then((results) => results[0]);
    /*
    return new Promise((resolve) => {
        chrome.storage.local.get([key], function(result: any) {
            if (key in result) {
                let item = result[key] as CachedItem;
                if ((now() - item.fetchTime)/1000.0 >= maxAge) {
                    return resolve(undefined);
                } else {
                    return resolve(item.data);
                }
            } else {
                return resolve(undefined);
            }
        })
    });
    */
}

export async function getOrCompute<T>(key: string, compute: () => Promise<T>, maxAge: number = 3600): Promise<T> {
    let value = await get(key)
    if (value) {
        return Promise.resolve(value);
    } else {
        return compute().then((value) => {
            let c = {
                fetchTime: now(),
                data: value
            };
            let o: { [key: string]: any; } = {};
            o[key] = c;
            chrome.storage.local.set(o);
            return value;
        });
    }
}


export async function getOrComputeMultiple(keys: string[], compute: ((ks:string[]) => Promise<{[key: string]: any}>), keyPrefix: string="", maxAge: number = 3600): Promise<{[key: string]: any}> {
    const prefixedKeys = keys.map((k) => keyPrefix + k);
    let values = await getMultiple(prefixedKeys, maxAge)
    let precomputedOut: {[key: string]: any} = {};
    let missingKeys: string[] = [];
    for (let i =0; i < keys.length; i+=1) {
        if(values[i] !== undefined) {
            precomputedOut[keys[i]] = values[i];
        } else {
            missingKeys.push(keys[i]);
        }
    }
    if (missingKeys.length > 0) {
        function fn() { return compute(missingKeys); }
        return retryPromise(fn).then((values) => {
            let out: {[key: string]: any} = {};
            for(const v of Object.keys(values)) {
                let c = {
                    fetchTime: now(),
                    data: values[v]
                };
                let o: { [key: string]: any; } = {};
                o[keyPrefix + v] = c;
                chrome.storage.local.set(o);
                out[v] = values[v];
            }            
            return Object.assign(out, precomputedOut);
        });
    } else {
        console.log("all precomp");
        return precomputedOut;
    }
}