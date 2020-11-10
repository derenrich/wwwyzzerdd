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
                    let token = data.query.tokens.csrftoken;
                    return token;
                });
            }
        );
}


export function getCachedToken(): Promise<string> {
    let TOKEN_KEY = "WD_TOKEN";
    return getOrCompute(TOKEN_KEY, getCSRF);
}


export async function addItemClaim(entity: string, property: string, qid: string): Promise<any> {
    return addClaim(entity, property, {"entity-type": "item", "id": qid});
}

export async function addClaim(entity: string, property: string, value: any): Promise<any> {
    let base_url = "https://www.wikidata.org/w/api.php?action=wbcreateclaim&format=json&snaktype=value&";    
    let token = encodeURIComponent(await getCachedToken());
    let wrappedValue = encodeURIComponent(JSON.stringify(value));
    let getArgs = `entity=${entity}&property=${property}&value=${wrappedValue}`;
    let summary = encodeURIComponent("import via Wwwyzzerdd for Wikidata");
    let args = `token=${token}&summary=${summary}`;
    
    return fetch(base_url + getArgs, {
        method: 'POST',
        body: args,
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "accept":"application/json, text/javascript, */*; q=0.01"
        }
    }).then((res) => res.json());  
}
