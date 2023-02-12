

const PARSE_VALUE_URL = "https://www.wikidata.org/w/api.php?action=wbparsevalue&format=json";
const FORMAT_VALUE_URL = "https://www.wikidata.org/w/api.php?action=wbformatvalue&format=json&generate=text/plain";
const DATATYPE_DATE = "time";

export interface ParsedDate {
    raw: string;
    value: {
        time: string;
        timezone: number;
        before: number;
        after: number;
        precision: number;
        calendarmodel: string;
    }
    type: string;
    renderedText?: string;
}

function mungeDateString(date: string, lang: string): string {
    if (lang === "es") {
        return date.replaceAll(" de ", " ");
    }
    return date;
}

export async function parseDate(date: string, lang: string): Promise<ParsedDate> {
    date = mungeDateString(date, lang);
    const options = JSON.stringify({ lang });
    let targetUrl = PARSE_VALUE_URL + "&datatype=" + DATATYPE_DATE + "&values=" + encodeURIComponent(date) + "&uselang=" + encodeURIComponent(lang) + "&options=" + encodeURIComponent(options); 

    let res = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
    });
    let json = await res.json();
    if (json.error || json.errors) {
        let errorMessage = json?.errors?.[0]?.["*"] ?? "unknown error";
        throw new Error("Error while parsing date: " + errorMessage);
    }
    let parsedDate = json.results?.[0] as ParsedDate;
    if (!parsedDate) {
        throw new Error("Unknown error while parsing date.");
    }
    let renderedText = await formatValue(parsedDate, DATATYPE_DATE, lang);
    parsedDate.renderedText = renderedText;
    return parsedDate;
}


async function formatValue(value: any, datatype: string, lang: string): Promise<string> {
    const options = JSON.stringify({ lang, showcalendar: "auto" });
    const datavalue = JSON.stringify(value);
    let targetUrl = FORMAT_VALUE_URL + "&datatype=" + DATATYPE_DATE + "&datavalue=" + encodeURIComponent(datavalue) + "&options=" + encodeURIComponent(options); 
    let res = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
    });
    let json = await res.json();
    if (json.error || json.errors) {
        let errorMessage = json?.error?.info ?? "unknown error";
        throw new Error("Error while rendering data: " + errorMessage);
    }
    let renderedText: string = json.result; 
    return renderedText;
}