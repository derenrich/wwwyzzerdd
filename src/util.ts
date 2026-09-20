import { getAuthToken } from "./auth";


const wikiLinkRegex = new RegExp("^https?:\/\/([a-z]+)\.(?:m\.)?wikipedia\.org\/wiki\/([^#]+)", "i");

export function getWikiLanguage(url: string): string | undefined {
    let m = wikiLinkRegex.exec(url);
    if (m && m.length > 1) {
        const lang = m[1].toLowerCase();
        return lang;
    }
    return undefined;
}


export async function retryPromise<T>(fn: () => Promise<T>): Promise<T> {
    async function tryCall(callNum: number): Promise<T | undefined> {
        try {
            return await fn();
        } catch (e) {
            console.log(`error on try ${callNum}`, e);
            // backoff
            await new Promise(resolve => setTimeout(resolve, 2000 * (callNum + 1)));
            return undefined;
        }
    }

    // attempts 4 times (final time we get the Exception)
    const result = (await tryCall(0)) || (await tryCall(1)) || (await tryCall(2));
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

/**
 * Abbreviates and cleans up a URL for UI display:
 * - Drops http:// or https:// protocol
 * - Drops leading www. from hostname
 * - Drops trailing slash
 * - Shortens deep paths to hostname/…/slug if too long
 * - Truncates with ellipsis if still exceeding maxLength
 */
export function formatDisplayUrl(url: string, maxLength: number = 45): string {
    try {
        let parsed = new URL(url);
        let host = parsed.host.replace(/^www\./i, "");
        let path = parsed.pathname;

        if ((path === "/" || path === "") && !parsed.search && !parsed.hash) {
            return host;
        }

        path = path.replace(/\/+$/, "");
        let queryAndHash = parsed.search + parsed.hash;
        let full = host + path + queryAndHash;

        if (full.length <= maxLength) {
            return full;
        }

        let segments = path.split("/").filter(Boolean);
        if (segments.length > 1) {
            let last = segments[segments.length - 1];
            let candidate = `${host}/…/${last}`;
            if (candidate.length <= maxLength) {
                return candidate;
            }
            let available = maxLength - host.length - 4;
            if (available > 5) {
                return `${host}/…/${last.slice(0, available)}…`;
            }
        }

        return full.slice(0, maxLength - 1) + "…";
    } catch {
        let clean = url
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .replace(/\/+$/, "");
        if (clean.length > maxLength) {
            return clean.slice(0, maxLength - 1) + "…";
        }
        return clean;
    }
}