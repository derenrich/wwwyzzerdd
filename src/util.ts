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

    const result = await tryCall(0) || await tryCall(1) || await tryCall(2);
    if (result == undefined) {
        throw new Error("could not complete promise after retries");
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

export async function retryWikimediaPromise(fn: () => Promise<any>): Promise<MWResponse> {
    return retryPromise(() => {
        let resp = fn();
        resp.then((r: MWResponse) => {
            if (r.error) {
                if (r.error.code == "badtoken") {
                    // force getting new token
                    getAuthToken(true);
                }
                throw new Error("error in wikimedia request");
            } else {
                return r;
            }
        });
        return resp;
    });
}