

export interface Settings {
    runOnLoad: boolean;
}

const SETTING_KEY = "   "

const defaultSettings: Settings = {
    runOnLoad: true
}


export function getSettings(): Promise<Settings> {
    return  new Promise(function(resolve) {
        chrome.storage.sync.get([SETTING_KEY], (items) => {
            if (SETTING_KEY in items) {
                resolve(items[SETTING_KEY]);
            } else {
                resolve(defaultSettings);
            }
        });
    });    
}

export function setSettings(settings: Settings) {
    let saver: any = {};
    saver[SETTING_KEY] = settings;
    chrome.storage.sync.set(saver);
}