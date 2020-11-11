
export interface CachedItem {
    fetchTime: number;
    data: any;
}

function now(): number {
    var d = new Date();
    return d.getTime();
}

function get(key: string, maxAge: number = 3600): Promise<any> {
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
}

export async function getOrCompute(key: string, compute: () => Promise<any>, maxAge: number = 3600): Promise<any> {
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
