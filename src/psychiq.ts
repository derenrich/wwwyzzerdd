import { retryDecorator, RetryConfig } from 'ts-retry-promise';


interface PsychiqQuery {
    inputs: string
}

interface PsychiqResponseRow {
    label: string;
    score: number;
}

export interface StatementSuggestions {
    pid: string;
    qid: string;
    score: number;
}

async function queryPsychiq(data: PsychiqQuery): Promise<PsychiqResponseRow[]> {



    const response = await fetch(
        "https://hf-proxy.toolforge.org/proxy/models/derenrich/psychiq2",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    try {
        const result: any[] = await response.json();
        if (result.length == 1) {
            return result[0];
        } else {
            throw new Error("Unexpected result from huggingface");
        }
    } catch (err) {
        throw err;
    }
}


const retryConfig: Partial<RetryConfig<PsychiqResponseRow[]>> = {
    retries: 30,
    delay: 360,
    backoff: "LINEAR",
    logger: console.log
};

const getPsychiqPrediction = retryDecorator(queryPsychiq, retryConfig);

type QueryCatResponse = {
    continue: {
        continue?: string;
        clcontinue?: string;
    }
    query: {
        pages: { [key: number]: QueryCatResponsePage }
    }
}
type QueryCatResponseItem = {
    ns: number;
    title: string;
};
type QueryCatResponsePage = {
    missing?: string;
    pageId?: number;
    ns?: number;
    title?: string;
    categories?: QueryCatResponseItem[];
};


async function getPsychiqDocument(pageId: number, wikiLanguage: string): Promise<string> {
    let categories: string[] = [];

    const fetchURL = `https://${wikiLanguage}.wikipedia.org/w/api.php?action=query&format=json&pageids=${pageId}&prop=categories&cllimit=500`;
    let title = "";
    let continueKey: string | undefined = "";
    do {
        const thisFetchUrl = continueKey ? fetchURL + `&clcontinue=${continueKey}` : fetchURL;
        const result = await fetch(thisFetchUrl);
        const responseBody: QueryCatResponse = await result.json();
        const response = responseBody.query?.pages;
        let categoryResponse: QueryCatResponsePage = response[pageId];
        if (categoryResponse.missing != undefined) {
            throw new Error("invalid pageId");
        }
        if (!title) {
            title = categoryResponse?.title!;
        }
        let newCategories: string[] = categoryResponse.categories!.map((x) => x.title.slice(9)).filter(isValidCategory);
        categories = categories.concat(newCategories)

        continueKey = responseBody?.continue?.clcontinue;
    } while (continueKey)

    return categories.concat(title).join("\n");
}



const BANNED_SUBSTRINGS = [
    "Short description", "Articles with", "All stub articles", "Wikidata", "Noindexed pages",
    "Redirects", "All articles", " dates", "Wikipedia articles", "wayback links", "Pages containing",
    "Articles containing", "Articles using", "Articles needing"
];

function isValidCategory(category: string) {
    for (let infix of BANNED_SUBSTRINGS) {
        if (category.includes(infix)) {
            return false;
        }
    }
    return true;
}

export async function suggestIdentifiers(pageId: number, wikiLanguage: string): Promise<StatementSuggestions[] | undefined> {
    let document = await getPsychiqDocument(pageId, wikiLanguage);
    let query: PsychiqQuery = {
        inputs: document
    };
    let rawPredictions = await getPsychiqPrediction(query);
    return rawPredictions.map((row) => {
        let splitRow = row.label.split("-");
        return {
            pid: splitRow[0],
            qid: splitRow[1],
            score: row.score
        }
    });
}