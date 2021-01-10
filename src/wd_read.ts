const WBK = require('wikibase-sdk');
import { getOrCompute } from "./cache";

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
        this.callback(a, b);
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
    // regex -> matcher info
    regexCache: Map<string, any>;

    booted: Promise<any>;
    
    constructor(onNewItem: CacheCallback<string, any>) {
        this.wdCache = new TriggerMap(onNewItem);
        this.qCache = new Map();
        this.pCache = new Map();
        this.regexCache = new Map();
        this.booted = this.init();
    }

    async init() {
        let propFetch = this.loadPropsCached();
        let regexFetched = this.loadRegexCached();
        return Promise.allSettled([propFetch, regexFetched]);
    }

    async loadPropsCached() {
        let PROP_KEY = "WD_PROPS";
        let res = getOrCompute(PROP_KEY, async () => {
            await this.loadProps();
            let x = Object.fromEntries(this.pCache.entries());
            return x;
        },  60 * 60 * 24);
        let props = await res;
        if(!this.pCache.size) {
            this.pCache = new Map(Object.entries(props));
        }
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
        await fetch(url).then((x) => x.json()).then((res) => {
            for(let prop of res.results.bindings) {
                let propUrl = prop.p.value;
                let splitUrl = propUrl.split("/");
                let propId = splitUrl[splitUrl.length - 1];
                let desc = prop.label.value;
                this.pCache.set(propId, desc);
            }
        });
    }

    async loadRegexCached() {
        let REGEX_KEY = "WD_REGEX";
        let res = getOrCompute(REGEX_KEY, async () => {
            await this.loadPatterns();
            let x = Object.fromEntries(this.regexCache.entries());
            return x;
        },  60 * 60 * 24);
        let regex = await res;
        if(!this.regexCache.size) {
            this.regexCache = new Map(Object.entries(regex));
        }
    }
    
    async loadPatterns() {
        let propQuery = `
SELECT ?p ?regexValue (COALESCE(?replacement, "\\\\1") as ?replacementString) (COALESCE(?q = wd:Q55121297, false) as ?caseInsensitive)
WHERE {
  ?p p:P8966 ?regex.
  ?regex ps:P8966 ?regexValue
  OPTIONAL {
     ?p wdt:P1552 ?q.
     ?q wdt:P31 wd:Q55121384.
  }
 OPTIONAL {?regex pq:P8967 ?replacement.}
}`;
        const url = wdk.sparqlQuery(propQuery);
        await fetch(url).then((x) => x.json()).then((res) => {
            for(let prop of res.results.bindings) {
                let propUrl = prop.p.value;
                let splitUrl = propUrl.split("/");
                let propId = splitUrl[splitUrl.length - 1];
                let regex = prop.regexValue.value;
                let replacementValue = prop.replacementString.value;
                let caseInsensitive = prop.caseInsensitive.value;
                this.regexCache.set(regex, {prop: propId, replacementValue: replacementValue, caseInsensitive: caseInsensitive});
            }
        });
    }
    
    lookupWikiUrls(urls: string[], full?: boolean) {
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
                props: full ? FULL_ITEM_PROPS : ITEM_PROPS
            }).replace("%E2%98%83", "%2B"); // there is no god
            let res = fetch(repairUrl(reqPath)).then(r => r.json()).then(this.handleWikiUrlResults.bind(this));
        }
    }


    lookupSingleWikiPage(title: string) {
        if (filterName(title)) {
            let reqPath = wdk.getEntitiesFromSitelinks({
                titles: title,
                sites: 'enwiki',
                languages: ['en'],
                props: ITEM_PROPS,
                normalize: true                
            });
            let res = fetch(repairUrl(reqPath)).then(r => r.json()).then(this.handleWikiUrlResults.bind(this));    
        }
    }
    
    handleWikiUrlResults(res: any) {
        if (res.success != 1) {
            return;
        }
        let failedLookups = [];
        for(let k of Object.keys(res.entities)){
            if (Number.parseInt(k) < 0) {
                failedLookups.push(res.entities[k].title);
            } else {
                this.qCache.set(k, res.entities[k]);
                let enwikiTitle = this.qCache.get(k).sitelinks.enwiki.title.replaceAll(" ", "_");
                this.wdCache.set(enwikiTitle, res.entities[k]);                
                if (("normalized" in res)) {
                    console.log(res);
                    let oldTitle = res.normalized.n['from'];
                    this.wdCache.set(oldTitle.replaceAll(" ", "_"), res.entities[k]);
                }
            }
        }
        if (Object.keys(res.entities).length > 1) {
            for (let k of failedLookups) {
                console.log(k);
                this.lookupSingleWikiPage(k);
            }
        }
    }

    async getProps(): Promise<any> {
        await this.booted;
        return Object.fromEntries(this.pCache.entries());
    }

    async getRegex(): Promise<any> {
        await this.booted;
        return Object.fromEntries(this.regexCache.entries());
    }
}

function parseWikiUrl(url: string): string {
    return decodeURIComponent(new URL(url).pathname.slice(6)).replace("+", "☃");;
}

function filterName(path: string): boolean {
    if (path.startsWith("File:") || path.startsWith("Template:") || path.startsWith("Special:") || path.startsWith("Template_talk:") || path.startsWith("Help:") || path.startsWith("Wikipedia:") || path.startsWith("Talk:")) {
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
let FULL_ITEM_PROPS = ['info', 'descriptions', 'aliases', 'labels', 'sitelinks', 'claims'];
let ITEM_PROPS = ['info', 'descriptions', 'aliases', 'labels', 'sitelinks'];

export { WikidataReader };
