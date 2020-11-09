import { BackgroundRequest, RequestType, GetWikidataIds, GetLinkData, LinkData } from "./common";

const REQ_LIMIT = 50;

const WBK_EDIT = require('wikibase-edit');

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
})


function filterName(path: string): boolean {
    if (path.startsWith("File:") || path.startsWith("Template:") || path.startsWith("Special:") || path.startsWith("Template_talk:") || path.startsWith("Help:") || path.startsWith("Wikipedia:")) {
        return false;
    }
    return true;
}

interface Cache { [key: string]: any; }
let qCache: Cache = {};
let pCache: Cache = {};
let wdCache: Cache = {};

function handleLinkResults(res: any): boolean {
    console.debug("handleLinkResults: call");
    if (res.success != 1) {
        return false;
    }
    let failedLookups = []
    for(let k of Object.keys(res.entities)){
        if (Number.parseInt(k) < 0) {
            failedLookups.push(res.entities[k].title);
        } else {
            qCache[k] = res.entities[k];
            let enwikiTitle = qCache[k].sitelinks.enwiki.title.replaceAll(" ", "_");
            wdCache[enwikiTitle] = k;
        }
    }
     return true;
}

function parseUrl(url: string): string {
    return decodeURIComponent(new URL(url).pathname.slice(6));
}

function repairUrl(url: string): string {
    // library is broken and doesn't handle "&" well
    let startToken = "&titles=";
    let start = url.indexOf(startToken);
    let end = url.indexOf("&sites=");
    let pages = url.slice(start + startToken.length, end);
    let newPages = pages.replaceAll("&", "%26");
    
    return url.slice(0, start) + startToken + newPages + url.slice(end);
}

function getWikidataIds(req: GetWikidataIds, reply: any) {
    console.debug("getWikidataIds: call");
    let urls = req.urls;
    let parsedUrls = urls.map(parseUrl).filter(filterName);
    let uniqUrls = Array.from(new Set(parsedUrls));

    let promises = [];
    for (let i = 0; i < uniqUrls.length; i += REQ_LIMIT) {
        let urlChunk = uniqUrls.slice(i, i + REQ_LIMIT);        
        let reqPath = wdk.getEntitiesFromSitelinks({
            titles: urlChunk,
            sites: 'enwiki',
            languages: ['en'],
            props: ['info', 'descriptions', 'aliases', 'labels', 'sitelinks', 'claims']
        });
        
        let res = fetch(repairUrl(reqPath)).then(r => r.json()).then(handleLinkResults);
        promises.push(res);
    }
    // return true if it all worked
    Promise.all(promises).then((p) => reply(p.reduce((x, y) => x && y)));
    return true;
}

function getLinkData(msg: GetLinkData, reply: any) {
    let url = msg.url;
    let name = parseUrl(url);
    let qid = wdCache[name];
    if (qid) {
        let d = qCache[qid];
        reply({
            qid: qid,
            label: d["labels"]["en"],
            aliases: d["aliases"]["en"],
            description: d["descriptions"]["en"],
            claims: d["claims"]
        });
    } else {
        console.log("failed lookup");
        console.log(name);
        console.log(wdCache);

        reply(null);
    }
    return true;
}

function getPropData(msg: any, reply: any) {
    reply(pCache[msg.prop]);
    return true;
}

function messageHandler(msg: BackgroundRequest, sender: any, reply: any) {
    switch(msg.reqType) {
        case RequestType.GET_WD_IDS:
            return getWikidataIds(msg.payload, reply);
        case RequestType.GET_LINK_DATA:
            return getLinkData(msg.payload, reply);
        case RequestType.GET_PROP_DATA:
            return getPropData(msg.payload, reply);
        case RequestType.GET_PROP_REC:
            return getPropRecs(msg.payload.entity, msg.payload.text, reply);
    }
}


chrome.runtime.onMessage.addListener(messageHandler);

function loadProps() { 
    let propQuery = `
SELECT ?p ?label
WHERE {
  ?p wdt:P31/wdt:P279* wd:Q18616576.
  ?p rdfs:label ?label.
  FILTER(LANG(?label) = "en").  
}`;
    const url = wdk.sparqlQuery(propQuery);
    fetch(url).then((x) => x.json()).then((res) => {
        for(let prop of res.results.bindings) {
            let propUrl = prop.p.value;
            let splitUrl = propUrl.split("/");
            let propId = splitUrl[splitUrl.length - 1];
            let desc = prop.label.value;
            pCache[propId] = desc;
        }
    });
}

loadProps();


function getPropRecs(item: string, text: string, reply: any) {
    let BASE_URL = "https://www.wikidata.org/w/api.php?action=wbsgetsuggestions&format=json&context=item";
    let full_url = BASE_URL + "&entity=" + encodeURIComponent(item) + "&search=" + encodeURIComponent(text);
    fetch(full_url).then((x) =>x.json()).then((x) => {
        reply(x);
    });
    return true;
}
