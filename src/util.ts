import { getAuthToken } from "./auth";

export async function retryPromise<T>(fn: () => Promise<T>): Promise<T> {
    async function tryCall(callNum: number): Promise<T | undefined> {
        try {
            return await fn();
        } catch (e) {
            console.log(`error on try ${callNum}`, e);
            return undefined;
        }
    }

    // attempts 4 times (final time we get the Exception)
    const result = await tryCall(0) || await tryCall(1) || await tryCall(2);
    if (result == undefined) {
        try {
            return await fn();
        } catch (e) {
            throw new Error(`Could not complete promise after retries due to "${e}"`);
        }

    }
    return result;

}

interface MWError {
    code: string;
    info: string;
}

interface MWResponse {
    error?: MWError;
    success?: number;
}

export async function retryWikimediaPromise(fn: () => Promise<any>, retriesLeft?: number): Promise<MWResponse> {
    return retryPromise(() => {
        let resp = fn();
        let nextRetry = retriesLeft ? retriesLeft - 1 : 0;
        return resp.then((r: MWResponse) => {
            if (r.error) {
                if (r.error.code == "badtoken") {
                    // force getting new token
                    getAuthToken(true);
                    if (nextRetry > 0) {
                        return retryWikimediaPromise(fn, nextRetry);
                    }
                    throw new Error("Wikimedia authentication error");
                } else if (r.error.code == "failed-save") {
                    if (nextRetry > 0) {
                        return retryWikimediaPromise(fn, nextRetry);
                    }
                }
                throw new Error("unknown error in Wikimedia request");
            } else {
                return r;
            }
        });
    });
}