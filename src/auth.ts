
import { getOrCompute } from "./cache";

async function getCSRF(): Promise<string> {
    return fetch("https://www.wikidata.org/w/api.php?action=query&meta=tokens&format=json")
        .catch(function(err) {
            console.log('Fetch Error', err);
        })
        .then(
            function(response) {
                if (!response) {
                    return;
                }
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
                                response.status);
                    return;
                }

                return response.json().then(function(data: any) {
                    if ("error" in data) {
                        throw new Error("unable to get token");
                    }
                    let token = data.query.tokens.csrftoken;
                    return token;
                });
            }
        );
}

export function getAuthToken(): Promise<string> {
    let TOKEN_KEY = "WD_TOKEN";
    let TEN_MINUTES = 60 * 10;

    return getOrCompute(TOKEN_KEY, getCSRF, TEN_MINUTES);
}