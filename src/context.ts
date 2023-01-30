import { MessageType } from "./messageBroker";

export enum SelectionType {
    STRING_SELECTION,
    DATE_SELECTION
}

export interface SelectionData {
    selectionType: SelectionType,
    text: string
}

export function initContext() {
    chrome.contextMenus.create(
    {
      id: "selection-date",
      title: "Parse As Date",
      contexts: ["selection"],
    });

    chrome.contextMenus.create(
        {
          id: "selection-string",
          title: "Parse As String",
          contexts: ["selection"],
        }, addListener);
}

function addListener() {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        switch (info.menuItemId) {
            case "selection-date":
                console.log(info, tab);
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, {type: MessageType.SET_PARSE_DATA, payload: info.selectionText}, {frameId: info.frameId});
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