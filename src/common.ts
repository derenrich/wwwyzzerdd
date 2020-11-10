export enum RequestType {
    GET_WD_IDS,
    GET_LINK_DATA,
    GET_PROP_DATA,
    GET_PROP_REC,
    ADD_CLAIM
}

export interface BackgroundRequest {
    reqType: RequestType;
    payload?: any;
}

export interface GetWikidataIds {
    urls: string[];
    full: boolean;
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

export interface AddClaim {
    sourceItem: string;
    property: string;
    targetItem: string;
}

export interface LinkData {
    url: string;
    qid: string;
    label: string;
    description: string;
    aliases: string[];
    claims: Map<string, any>;
}
