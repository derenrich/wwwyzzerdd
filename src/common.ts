export enum RequestType {
    GET_WD_IDS,
    GET_LINK_DATA,
    GET_PROP_DATA,
    GET_PROP_REC
}


export interface BackgroundRequest {
    reqType: RequestType;
    payload?: any;
}

export interface GetWikidataIds {
    urls: string[];
}

export interface GetLinkData {
    url: string;
}

export interface GetPropData {
    prop: string;
}

export interface GetPropRec {
    entity: string;
    text: string;
}

export interface LinkData {
    qid: string;
    label: string;
    description: string;
    aliases: string[];
    claims: Map<string, any>;
}
