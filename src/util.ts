

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