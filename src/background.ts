
import {registerBackendBroker} from "./messageBroker";
import {checkAllCaches} from "./cache";
import {initContext} from "./context";

registerBackendBroker();
initContext();

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
