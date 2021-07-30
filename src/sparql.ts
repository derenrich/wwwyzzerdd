import {retryPromise} from "./util"

const URL = "https://query.wikidata.org/sparql?format=json";

export default function runQuery(query: string): Promise<any> {
  const targetUrl = URL + "&query=" + encodeURIComponent(query);
  
  const getter = function() {
        return fetch(targetUrl, {
            method: 'GET',
            cache: 'no-cache',
            redirect: 'error',
        }).then((resp) => {
            return resp.json();
        }).then((d) => {
            if (d.error) {
                console.error(d.error);
                throw new Error(d.error);
            } else {
                return d;
            }
        });
    }
    return retryPromise(getter);
}