import {registerBackendBroker} from "./messageBroker";
import {registerExposeVariables} from "./exposeVariables";

chrome.runtime.onInstalled.addListener(() => {
    console.log("Wwwyzzerdd insalled 🧙");
});
  

chrome.runtime.onMessage.addListener((message, sender, resp) => {
  console.log("msg", message, sender, resp);
});

registerExposeVariables();
registerBackendBroker();


