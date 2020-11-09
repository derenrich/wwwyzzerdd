// code for reading from wikidata in a nice way
const WBK = require('wikibase-sdk');

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
})

type CacheCallback<x, y> = (a: x, b: y) => void;

class TriggerMap<x, y> extends Map<x, y> {
    callback: CacheCallback<x, y>;

    constructor(callback: CacheCallback<x, y>) {
        super();
        this.callback = callback;
    }
    
    set(a: x, b: y) {
        console.log("set called");
        return super.set(a, b);
    }
}


class WikidataReader {
    // qid -> data
    qCache: Map<string, any>;
    // pid -> data
    pCache: Map<string, any>;
    // url -> qid
    wdCache: Map<string, any>;

    booted: Promise<any>;
    
    constructor() {
        this.qCache = new Map();
        this.pCache = new Map();
        this.wdCache = new Map();
        this.booted = this.init();
    }

    async init() {
        await this.loadProps();
    }
    
    async loadProps() { 
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
                this.pCache.set(propId, desc);
            }
        });
    }

    
    lookupWikiUrls(urls: string[]) {
        // parse urls and filter out invalid ones
        let parsedUrls = urls.map(parseWikiUrl).filter(filterName);
        // remove duplicates
        let uniqUrls = Array.from(new Set(parsedUrls));

        for (let i = 0; i < uniqUrls.length; i += REQ_LIMIT) {
            let urlChunk = uniqUrls.slice(i, i + REQ_LIMIT);        
            let reqPath = wdk.getEntitiesFromSitelinks({
                titles: urlChunk,
                sites: 'enwiki',
                languages: ['en'],
                props: ITEM_PROPS
            });        
            let res = fetch(repairUrl(reqPath)).then(r => r.json()).then(this.handleWikiUrlResults);
        }
    }

    handleWikiUrlResults(res: any) {
        if (res.success != 1) {
            return;
        }
        let failedLookups = []
        for(let k of Object.keys(res.entities)){
            if (Number.parseInt(k) < 0) {
                failedLookups.push(res.entities[k].title);
            } else {
                this.qCache.set(k, res.entities[k]);
                let enwikiTitle = this.qCache.get(k).sitelinks.enwiki.title.replaceAll(" ", "_");
                this.wdCache.set(enwikiTitle, k);
            }
        }
        for (let k of failedLookups) {
            // retry
        }
    }

    async getProp(propId: string): Promise<any> {
        await this.booted;
        return this.pCache.get(propId);
    }    
}

function parseWikiUrl(url: string): string {
    return decodeURIComponent(new URL(url).pathname.slice(6));
}

function filterName(path: string): boolean {
    if (path.startsWith("File:") || path.startsWith("Template:") || path.startsWith("Special:") || path.startsWith("Template_talk:") || path.startsWith("Help:") || path.startsWith("Wikipedia:")) {
        return false;
    }
    return true;
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

let REQ_LIMIT = 50;
let ITEM_PROPS = ['info', 'descriptions', 'aliases', 'labels', 'sitelinks', 'claims'];

export { WikidataReader };
