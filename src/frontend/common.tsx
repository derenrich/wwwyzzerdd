export interface CloseParam {
    close?: () => void;
}

export interface QidData {
    qid: string;
    label?: string;
    description?: string;
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
