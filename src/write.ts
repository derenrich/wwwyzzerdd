import { getAuthToken, ANON_TOKEN } from "./auth";
import { retryWikimediaPromise } from "./util";
import { getConfig, ConfigObject } from "./config";
import {saveLastQidProperty} from "./propertyData";

const commentText = "import w/ [[Wikidata:Wwwyzzerdd|🧙 Wwwyzzerdd for Wikidata]]";


export async function addItemClaim(entity: string, property: string, qid: string): Promise<any> {
    saveLastQidProperty(qid, property);
    return addClaim(entity, property, {"entity-type": "item", "id": qid});
}

export async function addIdClaim(entity: string, property: string, value: string): Promise<any> {
    return addClaim(entity, property, value);
}

export async function addClaim(entity: string, property: string, value: any): Promise<any> {
    let base_url = "https://www.wikidata.org/w/api.php?action=wbcreateclaim&format=json&snaktype=value&tags=wwwyzzerdd&";
    let token = await checkedGetToken();
    let wrappedValue = encodeURIComponent(JSON.stringify(value));
    let getArgs = `entity=${entity}&property=${property}&value=${wrappedValue}`;
    let summary = encodeURIComponent(commentText);
    let args = `token=${token}&summary=${summary}`;


    return retryWikimediaPromise(() => {
        return fetch(base_url + getArgs, {
            method: 'POST',
            body: args,
            headers: {
             "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
             "accept":"application/json, text/javascript, */*; q=0.01"
            }
        }).then((res) => res.json());
    });
}

export async function addCoordClaim(entity: string, property: string, lat: number, lon: number): Promise<any> {
    
}

function currentTimeValue() {
    let now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCHours(0);
    now.setUTCMinutes(0);
    let today = "+" + now.toISOString().replace(".000","");
    return {"type":"time","value":{"after":0,"before":0,"calendarmodel":"http://www.wikidata.org/entity/Q1985727","precision":11,"time":today,"timezone":0}};
}

export async function addReference(sourceUrl: string, claimId: string, wikiLanguage?: string) {
    let base_url = "https://www.wikidata.org/w/api.php?action=wbsetreference&format=json&tags=wwwyzzerdd&";
    let token = await checkedGetToken();
    let summary = encodeURIComponent(commentText);

    let PAGE_VERSION_URL_PID = "P4656";
    let IMPORTED_FROM_WIKIMEDIA_PID = "P143";
    let ENGLISH_WIKI = "Q328";
    let FRENCH_WIKI = "Q8447";
    let GERMAN_WIKI = "Q48183";
    let JAPANESE_WIKI = "Q177837";
    let RETRIEVED_TIME_PID = "P813";
    let SPANISH_WIKI = "Q8449";
    // for now just support these top wikis
    let wikiLookup: { [key: string]: string; } = {
        "en": ENGLISH_WIKI,
        "fr": FRENCH_WIKI,
        "de": GERMAN_WIKI,
        "es": SPANISH_WIKI,
        "ja": JAPANESE_WIKI
    }

    let refSnack: { [key: string]: any; } = { };

    if (wikiLanguage && wikiLanguage   in wikiLookup) {
        let wikiQid = wikiLookup[wikiLanguage];
        refSnack[IMPORTED_FROM_WIKIMEDIA_PID] =
            [
                {
                    snaktype: "value",
                    property: IMPORTED_FROM_WIKIMEDIA_PID,
                    datavalue: { type:"wikibase-entityid", value:{"id": wikiQid}}
                }
            ];
    }
    refSnack[RETRIEVED_TIME_PID] = [ { snaktype:"value",
                                       property: RETRIEVED_TIME_PID,
                                       datavalue: currentTimeValue()}];
    if (sourceUrl) {
        refSnack[PAGE_VERSION_URL_PID] = [{
            snaktype: "value",
            property: PAGE_VERSION_URL_PID,
            datavalue: {"type":"string", "value": sourceUrl}
        }];
    }
    let args = `token=${token}&summary=${summary}`;
    let snaks =  encodeURIComponent(JSON.stringify(refSnack));
    let getArgs = `statement=${claimId}&snaks=${snaks}`;
    return fetch(base_url + getArgs, {
        method: 'POST',
        body: args,
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "accept":"application/json, text/javascript, */*; q=0.01"
        }
    });
}

async function checkedGetToken(): Promise<string> {
    let auth_token = await getAuthToken();
    if (auth_token == ANON_TOKEN) {
        // are we ok editing anonymously?
        let config = await getConfig();
        if (!config.allowAnon) {
            throw new Error("Editing wikidata anonymously is disallowed.");
        }
    }
    let token = encodeURIComponent(auth_token);
    return token;
}
