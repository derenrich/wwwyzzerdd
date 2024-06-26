import { getOrCompute, put, get } from './cache';
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
    caseInsensitive: boolean;
}

interface PropertyData {
    prop: string;
    name: string;
    icon: string | undefined;
    propType: string;
}

export interface PropertySuggestions {
    timestamp: number;
    suggestions: string[];
}

const ITEM_PROP_TYPE = "WikibaseItem";
const DATE_PROP_TYPE = "Time";

const patternQuery = `
SELECT ?p ?regexValue (COALESCE(?replacement, "\\\\1") as ?replacementString) (COALESCE(?q = wd:Q55121183, false) as ?caseInsensitive)
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
SELECT distinct ?p ?label ?icon ?type
WHERE {
  ?p wdt:P31/wdt:P279* wd:Q18616576.
  ?p rdfs:label ?label.
  OPTIONAL {   ?p wdt:P2910 ?icon. }
  ?p wikibase:propertyType ?type.
  FILTER(LANG(?label) = "en").
}
`

const PATTERN_CACHE_KEY = "WD_PROP_PATTERN_CACHE_KEY";
const PROP_CACHE_KEY = "WD_PROP_CACHE_KEY";
const PROP_TYPE_KEY = "WD_PROP_TYPE_KEY";
const PROP_NAME_KEY = "WD_PROP_NAME_KEY";
const PROP_CACHE_LIFE = 60 * 60; // 1 hr cache time

const LAST_QID_USE_NS = "WD_LAST_PID$";


function parsePatternFetch(d: any): PropertyPatternData[] {
    let properties = [];
    for (let prop of d.results.bindings) {
        let propUrl = prop.p.value;
        let splitUrl = propUrl.split("/");
        let propId = splitUrl[splitUrl.length - 1];
        let regex = prop.regexValue.value;
        let replacementValue = prop.replacementString.value;
        let caseInsensitive = prop.caseInsensitive.value;
        const row = { regex, prop: propId, replacementValue, caseInsensitive };
        properties.push(row);
    }
    return properties;
}

function parsePropFetch(d: any): PropertyData[] {
    let properties = [];
    for (let prop of d.results.bindings) {
        let propUrl = prop.p.value;
        let splitUrl = propUrl.split("/");
        let propId = splitUrl[splitUrl.length - 1];
        let label = prop.label.value;
        let icon = prop.icon ? prop.icon.value : undefined;
        let propType = prop.type.value.split("#")[1];
        const row = { prop: propId, name: label, icon, propType };
        properties.push(row);
    }
    return properties;
}

interface CachedRegexData {
    regex: RegExp;
    propertyData: PropertyPatternData;
    caseInsensitive: boolean;
}

export class PropertyDB {
    pattern_results: Promise<PropertyPatternData[]>;
    prop_results: Promise<PropertyData[]>;
    // one of WikibaseItem, String, Quantity, ExternalId, ...
    prop_types: Promise<{ [pid: string]: string }>;
    prop_names: Promise<{ [pid: string]: string }>;
    regex_results: Promise<CachedRegexData[]>;

    constructor() {
        this.pattern_results = getOrCompute(PATTERN_CACHE_KEY, function () {
            return runQuery(patternQuery).then((res) => {
                return parsePatternFetch(res);
            });
        }, PROP_CACHE_LIFE)

        // precompile all regexs
        this.regex_results = this.pattern_results.then((results) => {
            let regexCache: CachedRegexData[] = [];
            for (const propData of results) {
                try {
                    const r = new RegExp(propData.regex);
                    regexCache.push({
                        regex: r,
                        propertyData: propData,
                        caseInsensitive: propData.caseInsensitive
                    });
                } catch (e) {
                    console.warn("Failed to parse URL with pattern " + propData.regex, e);
                }
            }
            return regexCache;
        });

        this.prop_results = getOrCompute(PROP_CACHE_KEY, function () {
            return runQuery(propQuery).then((res) => {
                return parsePropFetch(res);
            });
        }, PROP_CACHE_LIFE);

        this.prop_types = getOrCompute(PROP_TYPE_KEY, (): (Promise<{ [pid: string]: string }>) => {
            return this.prop_results.then(function (result: PropertyData[]): { [pid: string]: string } {
                let out: { [pid: string]: string } = {};
                result.forEach((row) => {
                    out[row.prop] = row.propType;
                })
                return out;
            });
        }, PROP_CACHE_LIFE);


        this.prop_names = getOrCompute(PROP_NAME_KEY, (): (Promise<{ [pid: string]: string }>) => {
            return this.prop_results.then(function (result: PropertyData[]): { [pid: string]: string } {
                let out: { [pid: string]: string } = {};
                result.forEach((row) => {
                    out[row.prop] = row.name;
                })
                return out;
            });
        }, PROP_CACHE_LIFE);
    }


    async getProperties(language?: string): Promise<PropertyData[]> {
        // WARNING: this language code switch not currently work (just returns english)
        if (!language || language == "en") {
            return this.prop_results;
        } else {
            return getOrCompute(PROP_CACHE_KEY + "@" + language, function () {
                return runQuery(propQuery).then((res) => {
                    return parsePropFetch(res);
                });
            }, PROP_CACHE_LIFE)
        }
    }

    async parseUrl(url: string): Promise<PropertyMatch | undefined> {
        const results = await this.regex_results;
        for (const p of results) {
            let match = p.regex.exec(url);
            if (match && match.length > 1) {
                let pid = p.propertyData.prop;
                let pattern = p.propertyData.replacementValue;
                var key: string = String(pattern);
                for (var i = 1; i < match.length; i += 1) {
                    key = key.replaceAll("\\" + i, match[i]);
                }
                return {
                    prop: pid,
                    identifier: key,
                    caseInsensitive: p.caseInsensitive
                };
            }
        }
        return undefined;
    }

    async suggestProperty(itemQid: string, typed: string, mode: string, targetQid?: string): Promise<PropertySuggestions> {
        let now = Date.now();
        let BASE_URL = "https://www.wikidata.org/w/api.php?action=wbsgetsuggestions&format=json&context=item";
        let full_url = BASE_URL + "&entity=" + encodeURIComponent(itemQid) + "&search=" + encodeURIComponent(typed);
        let propTypes = await this.prop_types;
        let lastPidSuggestion: any | undefined = undefined;
        if (typed == "" && targetQid) {
            lastPidSuggestion = await this.getLastQidProperty(targetQid);
        }

        return fetch(full_url).then((x) => x.json()).then((x) => {
            let allSuggestions = (x.search || []);
            let validSuggestions = []
            if (mode == "qid") {
                validSuggestions = allSuggestions.filter((sugg: any) => propTypes[sugg.id] == ITEM_PROP_TYPE);
            } else if (mode == "date") {
                validSuggestions = allSuggestions.filter((sugg: any) => propTypes[sugg.id] == DATE_PROP_TYPE);
            }
            if (lastPidSuggestion) {
                let pid = lastPidSuggestion.id;
                validSuggestions = [lastPidSuggestion].concat(validSuggestions.filter((sugg: any) => sugg.id != pid));
            }
            return {
                timestamp: now,
                suggestions: validSuggestions
            }
        });
    }

    async getLastQidProperty(itemQid: string): Promise<any | undefined> {
        let pid = await get(LAST_QID_USE_NS + itemQid, 60 * 60 * 24 * 2);
        if (pid) {
            let prop_names = await this.prop_names;
            let name = prop_names[pid];
            if (name) {
                return {
                    id: pid,
                    label: name
                };
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }
}

// remember the last use of a property for this qid
export function saveLastQidProperty(itemQid: string, pid: string) {
    put(LAST_QID_USE_NS + itemQid, pid);
}
