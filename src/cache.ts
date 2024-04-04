import { retryPromise } from "./util";

const maxMaxAge = 60 * 60 * 24 * 3; // nothing is stored longer than 3 days

export interface CachedItem {
    fetchTime: number; // in unix time ms
    data: any;
}

function now(): number {
    var d = new Date();
    return d.getTime();
}

function isExpired(ts: number, maxAge: number) {
    return (now() - ts) / 1000.0 >= maxAge;
}

function getMultiple(keys: string[], maxAge: number = 3600): Promise<any[]> {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, function (result: any) {
            let resultArr = [];
            for (let key of keys) {
                if (key in result) {
                    let item = result[key] as CachedItem;
                    if (isExpired(item.fetchTime, maxAge)) {
                        resultArr.push(undefined);
                    } else {
                        resultArr.push(item.data);
                    }
                } else {
                    resultArr.push(undefined);
                }
            }
            resolve(resultArr);
        });
    });
}

export function get(key: string, maxAge: number = 3600): Promise<any> {
    return getMultiple([key], maxAge).then((results) => results[0]);
}

export function put(key: string, value: any) {
    let c = {
        fetchTime: now(),
        data: value
    };
    let pair: { [key: string]: any; } = {};
    pair[key] = c;
    chrome.storage.local.set(pair);
}

export async function getOrCompute<T>(key: string, compute: () => Promise<T>, maxAge: number = 3600): Promise<T> {
    let value = await get(key, maxAge);
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

export async function getOrComputeMultiple(keys: string[], compute: ((ks: string[]) => Promise<{ [key: string]: any }>), keyPrefix: string = "", maxAge: number = 3600): Promise<{ [key: string]: any }> {
    const prefixedKeys = keys.map((k) => keyPrefix + k);
    let values = await getMultiple(prefixedKeys, maxAge)
    let precomputedOut: { [key: string]: any } = {};
    let missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i += 1) {
        if (values[i] !== undefined) {
            precomputedOut[keys[i]] = values[i];
        } else {
            missingKeys.push(keys[i]);
        }
    }
    if (missingKeys.length > 0) {
        function fn() { return compute(missingKeys); }
        return retryPromise(fn).then((values) => {
            let out: { [key: string]: any } = {};
            for (const v of Object.keys(values)) {
                if (values[v]) {
                    let c = {
                        fetchTime: now(),
                        data: values[v]
                    };
                    let o: { [key: string]: any; } = {};
                    o[keyPrefix + v] = c;
                    chrome.storage.local.set(o);
                }
                out[v] = values[v];
            }
            return Object.assign(out, precomputedOut);
        });
    } else {
        return precomputedOut;
    }
}

export function checkAllCaches() {
    chrome.storage.local.get(function (result: { [key: string]: any }) {
        let numberRemoved = 0;
        let totalNumber = 0;
        for (let key in result) {
            const value = result[key] as CachedItem;
            totalNumber += 1;
            if (isExpired(value.fetchTime, maxMaxAge)) {
                chrome.storage.local.remove(key);
                numberRemoved += 1;
            }
        }
        console.log("Expired " + numberRemoved + " keys out of " + totalNumber + ".");
    });
}