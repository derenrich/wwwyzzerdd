import {registerBackendBroker} from "./messageBroker";
import {exposeWikiVariables} from "./exposeVariables";

chrome.runtime.onInstalled.addListener(() => {
    console.log("Wwwyzzerdd insalled 🧙");
});

chrome.runtime.onMessage.addListener((message, sender, resp) => {
  //console.log("msg", message, sender, resp);
});

function onWikipediaLoadRegister() {
  const filter: chrome.webNavigation.WebNavigationEventFilter = {
      url: [
        {
          hostSuffix: '.wikipedia.org',
        },
      ],
    };

  chrome.webNavigation.onDOMContentLoaded.addListener((details: any) => {
      let tabId = details.tabId;
      chrome.scripting.executeScript(
          {
            target: {tabId: tabId},
            func: exposeWikiVariables,
            world: "MAIN"
          },
      );
  }, filter);
}

onWikipediaLoadRegister();
registerBackendBroker();
