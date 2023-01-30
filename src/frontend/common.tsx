export interface CloseParam {
    close?: () => void;
}

export interface QidData {
    qid: string;
    label?: string;
    description?: string;
}

export interface SpanField {
    lang: string;
    field: string;
}

export function renderSpanField(sf: SpanField | string): string {
    if (typeof sf === "string" ) {
        return sf as string;
    } else {
        return `${(sf as SpanField).field}[${(sf as SpanField).lang}]`;
    }
}

export interface PropTuple {
    propId: string;
    propName?: string;
}

export function getSourceUrl(): string {
    let link = document.querySelector("#t-permalink a");
    if (link) {
        return (link as HTMLAnchorElement).href;
    } else {
        // for the mobile use case
        let link = document.querySelector("a.menu__item--page-actions-overflow-permalink");
        if (link) {
            return (link as HTMLAnchorElement).href;
        } else {
            return document.baseURI;
        }
    }
}
