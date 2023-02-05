import { MessageType } from "./messageBroker";
import { getWikiLanguage } from "./util";
import { parseDate } from "./parseString";

export enum SelectionType {
    STRING_SELECTION,
    DATE_SELECTION
}

export interface SelectionData {
    selectionType: SelectionType,
    text: string,
    payload?: any
}



export function initContext() {
    chrome.contextMenus.create(
        {
          id: "selection-string",
          title: "Parse As String",
          contexts: ["selection"],
        }, addListener);
    chrome.contextMenus.create(
    {
      id: "selection-date",
      title: "Parse As Date",
      contexts: ["selection"],
    });
}

function addListener() {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        switch (info.menuItemId) {
            case "selection-date":
                if (tab && tab.id) {
                    if (tab.url) {
                        let lang = getWikiLanguage(tab.url)
                        let parsedDatePromise = parseDate(info.selectionText ?? "", lang ?? "en");
                        parsedDatePromise.then((parsedDate) => {
                            let payload: SelectionData = {
                                selectionType: SelectionType.STRING_SELECTION,
                                text: info.selectionText ?? "",
                                payload: parsedDate
                            }
                            chrome.tabs.sendMessage(tab.id ?? 0, {type: MessageType.SET_PARSE_DATE, payload: payload}, {frameId: info.frameId});
                        }).catch((e) => {
                            let errorMessage: string = "Error parsing date.";
                            if (e instanceof Error) {
                                errorMessage = e.message;
                            }
                            chrome.tabs.sendMessage(tab.id ?? 0, {type: MessageType.REPORT_ERROR, payload: {errorMessage}}, {frameId: info.frameId});
                        });
                    }
                }
                break;
            case "selection-string":
                let payload: SelectionData = {
                    selectionType: SelectionType.STRING_SELECTION,
                    text: info.selectionText ?? ""
                }
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, {type: MessageType.SET_PARSE_DATA, payload}, {frameId: info.frameId});
                }
                break;
        }
    });
}