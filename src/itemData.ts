import { getOrComputeMultiple } from "./cache";

const GET_ENTITIES_URL="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en"
const REQ_LIMIT = 50;
const SOURCE_PROPS = ['info', 'descriptions', 'aliases', 'labels', 'claims'].join("|");
const LINKED_PROPS = ['labels', 'descriptions', 'sitelinks'].join('|');

export interface LinkedItemData {
    qid: string;
    label: string | undefined;
    description: string | undefined;
}

export function getQidsFromTitles(titles: string[]): Promise<{[key: string]: LinkedItemData }> {
    // TODO: handle pipes in titles
    let concatTitleChunk = encodeURIComponent(titles.join("|"));
    let site = "enwiki";
    let lang = "en";
    let targetUrl = GET_ENTITIES_URL + "&props=" + encodeURIComponent(LINKED_PROPS) + "&sites=" + encodeURIComponent(site) + "&titles=" + concatTitleChunk + "&sitefilter=" + encodeURIComponent(site);
    return fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
    }).then((resp) => {
        return resp.json();
    }).then(async (data) => {
        if (data.error) {
            console.error(data.error);
            throw new Error();
        } else {
            const entities = data['entities'];
            let missingKeys: string[] = [];
            let out: {[key: string]: LinkedItemData} = {};
            for (let qid of Object.keys(entities)) {
                const ent = entities[qid];
                if ("missing" in ent) {
                    missingKeys.push(ent.title);
                } else {
                    let title = ent["sitelinks"][site].title;
                    let label = (ent["labels"][lang] || {})["value"];
                    let description = (ent["descriptions"][lang] || {})["value"];
                    let linkData = {
                        qid,
                        label,
                        description
                    }
                    out[title] = linkData;
                }
            }
            for (let missingTitle of missingKeys) {
                let linkData = await getQidFromTitle(missingTitle);
                if (linkData) {
                    out[missingTitle] = linkData;
                }
            }
            return out;
        }
    });
}

// uses normalization functionality
function getQidFromTitle(title: string): Promise<LinkedItemData | undefined> {
    let site = "enwiki";
    let lang = "en";
    let targetUrl = GET_ENTITIES_URL + "&normalize=true&props=" + encodeURIComponent(LINKED_PROPS) + "&sites=" + encodeURIComponent(site) + "&titles=" + encodeURIComponent(title) + "&sitefilter=" + encodeURIComponent(site);
    return fetch(targetUrl, {
        method: 'GET',
        redirect: 'error',
    }).then((resp) => {
        return resp.json();
    }).then((data) => {
        if ("error" in data) {
            console.error(data.error);
            throw new Error();
        } else {
            const entities = data['entities'];
            for (let qid of Object.keys(entities)) {

                const ent = entities[qid];
                if (("missing" in ent)) {
                    break;
                }
                let label = (ent["labels"][lang] || {})["value"];
                let description = (ent["descriptions"][lang] || {})["value"];

                if ("sitelinks" in ent) {
                    return {
                        qid,
                        label,
                        description
                    };
                }
            }
            return undefined;
        }
    });        
}

function getContentFromQids(qids: string[]): Promise<{[key: string]: any}> {
    let concatQids = qids.join("|");
    let site = "enwiki";
    let language = "en";
    let targetUrl = GET_ENTITIES_URL + "&props=" + encodeURIComponent(SOURCE_PROPS) + "&sites=" + encodeURIComponent(site) + "&ids=" + concatQids;
    return fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
    }).then((resp) => {
        return resp.json();
    }).then((data) => {
        if ("error" in data) {
            console.error(data.error);
            throw new Error();
        } else {
            return data.entities;
        }
    })

}


const TITLE_CACHE_SEC = 12 * 60 * 60;
const STATEMENT_CACHE_SEC = 5 * 60;

export class ItemDB {
    constructor() {

    }

    //handleQueries(queries: ItemLinkQuery[]) {        
    //}

    async lookupTitles(titles: string[]): Promise<{[key: string]: LinkedItemData}> {
        let uniqTitles = Array.from(new Set(titles));
        let out: {[key: string]: LinkedItemData} = {}; 
        for (let i = 0; i < uniqTitles.length; i += REQ_LIMIT) {
            let titleChunk = uniqTitles.slice(i, i + REQ_LIMIT);
            let batch = await getOrComputeMultiple(titleChunk, getQidsFromTitles, "title2qid_", TITLE_CACHE_SEC);
            Object.assign(out, batch);
        }
        return out;
    }

    async lookupQidContent(qids: string[], skipCache: boolean | undefined = false): Promise<{[key: string]: string}> {
        // remove duplicates
        let uniqQids = Array.from(new Set(qids));
        let out: {[key: string]: any} = {}; 
        for (let i = 0; i < uniqQids.length; i += REQ_LIMIT) {
            let qidChunk = uniqQids.slice(i, i + REQ_LIMIT);
            let cacheTime = skipCache ? 0 : STATEMENT_CACHE_SEC;
            let batch = await getOrComputeMultiple(qidChunk, getContentFromQids, "qid2content_", cacheTime);
            Object.assign(out, batch);            
        }
        return out;
    }
}
