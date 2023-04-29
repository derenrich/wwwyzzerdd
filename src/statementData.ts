import {retryWikimediaPromise} from "./util";

const GET_CONSTRAINT_URL="https://www.wikidata.org/w/api.php?action=wbcheckconstraints&format=json&claimid=";

export async function getConstaintViolations(statementId: string): Promise<string | null> {
    let resp: any = await retryWikimediaPromise(() => {
        return fetch(GET_CONSTRAINT_URL + statementId, {
            method: 'GET',
            headers: {
             "accept":"application/json, text/javascript, */*; q=0.01"
            }
        }).then((res) => res.json());
    });
    // this is a nightmare.
    if (resp && resp.success) {
        let constraints = resp.wbcheckconstraints;
        if (constraints) {
            let qids = Object.keys (resp.wbcheckconstraints);
            if (qids.length > 0) {
                let qid = qids[0];
                let claims = resp.wbcheckconstraints[qid].claims;
                let pids = Object.keys(claims);
                if (pids.length > 0) {
                    let pid = pids[0];
                    let statements = claims[pid];
                    if (statements.length > 0) {
                        let statement = statements[0];
                        let results = statement?.mainsnak?.results;
                        if (results && results.length > 0) {
                            // only consider the first result and only return the string
                            let error = results[0]["message-html"];
                            return error;
                        }
                    }
                }
            }
        }
 
    }
    return null;
}