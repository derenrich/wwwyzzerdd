
import { registerBackendBroker } from "./messageBroker";
import { checkAllCaches } from "./cache";
import { initContext } from "./context";
import { exposeWikiVariables } from "./exposeVariables";

registerBackendBroker();
initContext();
registerWikipediaNavigationHandler();

// occasionally cleanup caches
const CLEAR_CACHE_ALARM = "clearWwwyzzerddCache";
chrome.alarms.create(
    CLEAR_CACHE_ALARM,
    {
        "periodInMinutes": 30
    }
  );
chrome.alarms.onAlarm.addListener(function(alarmInfo) {
    if (alarmInfo.name == CLEAR_CACHE_ALARM) {
        console.log("Clearing caches...")
        checkAllCaches();
    }
});



function registerWikipediaNavigationHandler(): void {
    chrome.runtime.onInstalled.addListener(() => {
            console.log("Wwwyzzerdd installed 🧙");

    const filter: chrome.webNavigation.WebNavigationEventFilter = {
        url: [
            {
                hostSuffix: ".wikipedia.org",
            },
        ],
    };

    chrome.webNavigation.onDOMContentLoaded.addListener((details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => {
        chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: exposeWikiVariables,
            world: "MAIN",
        });
    }, filter);
    });

}
