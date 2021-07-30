import {getOrCompute} from './cache';
import runQuery from './sparql'

interface PropertyPatternData {
    regex: string;
    prop: string;
    replacementValue: string;
    caseInsensitive: boolean;
}

export interface PropertyMatch {
    prop: string;
    identifier: string;
}

interface PropertyData {
    prop: string;
    name: string;
    icon: string | undefined;
}

export interface PropertySuggestions {
    timestamp: number;
    suggestions: string[];
}

const patternQuery = `
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

const propQuery = `
SELECT distinct ?p ?label ?icon
WHERE {
  ?p wdt:P31/wdt:P279* wd:Q18616576.
  ?p rdfs:label ?label.
  OPTIONAL {   ?p wdt:P2910 ?icon. }
  FILTER(LANG(?label) = "en").
}
`

const PATTERN_CACHE_KEY = "WD_PROP_PATTERN_CACHE_KEY";
const PROP_CACHE_KEY = "WD_PROP_CACHE_KEY";
const PROP_CACHE_LIFE = 60 * 60; // 1 hr cache time

function parsePatternFetch(d: any): PropertyPatternData[] {
    let properties = [];
    for(let prop of d.results.bindings) {
        let propUrl = prop.p.value;
        let splitUrl = propUrl.split("/");
        let propId = splitUrl[splitUrl.length - 1];
        let regex = prop.regexValue.value;
        let replacementValue = prop.replacementString.value;
        let caseInsensitive = prop.caseInsensitive.value;
        const row = {regex, prop: propId, replacementValue, caseInsensitive};
        properties.push(row);
    }
    return properties;
}

function parsePropFetch(d: any): PropertyData[] {
    let properties = [];
    for(let prop of d.results.bindings) {
        let propUrl = prop.p.value;
        let splitUrl = propUrl.split("/");
        let propId = splitUrl[splitUrl.length - 1];
        let label = prop.label.value;
        let icon = prop.icon ? prop.icon.value : undefined;
        const row = {prop: propId, name: label, icon};
        properties.push(row);
    }
    return properties;
}

export class PropertyDB {
    pattern_results: Promise<PropertyPatternData[]>;
    prop_results: Promise<PropertyData[]>

    constructor() {
        this.pattern_results = getOrCompute(PATTERN_CACHE_KEY, function() {
            return runQuery(patternQuery).then((res) => {
                return parsePatternFetch(res);
            });
        }, PROP_CACHE_LIFE)

        this.prop_results = getOrCompute(PROP_CACHE_KEY, function() {
            return runQuery(propQuery).then((res) => {
                return parsePropFetch(res);
            });
        }, PROP_CACHE_LIFE)

    }
    

    async getProperties(): Promise<PropertyData[]> {
        return this.prop_results;
    }


    async parseUrl(url: string): Promise<PropertyMatch|undefined> {
        const results = await this.pattern_results;
        for (const propData of results) {
            const regexMode = propData.caseInsensitive ? "i" : "";
            const r = new RegExp(propData.regex, regexMode);
            let match = r.exec(url);
            if (match && match.length > 1) {
                let pid = propData.prop;
                let pattern = propData.replacementValue;
                var key: string = String(pattern);
                console.log(r, pid, pattern, key, match);
                for (var i = 1; i < match.length; i+=1) {
                    key = key.replaceAll("\\" + i, match[i]);
                }
                return {
                    prop: pid,
                    identifier: key
                };
            }
        }
        return undefined;
    }

    async suggestProperty(itemQid: string, typed: string): Promise<PropertySuggestions> {
        let now = Date.now();
        let BASE_URL = "https://www.wikidata.org/w/api.php?action=wbsgetsuggestions&format=json&context=item";
        let full_url = BASE_URL + "&entity=" + encodeURIComponent(itemQid) + "&search=" + encodeURIComponent(typed);
        return fetch(full_url).then((x) =>x.json()).then((x) => {
            return {
                timestamp: now,
                suggestions: (x.search || {}).map((sug: any) => sug.id)
            }
        });
    
    }
}
