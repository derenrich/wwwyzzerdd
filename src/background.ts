import { AddClaim, BackgroundRequest, RequestType, GetWikidataIds, GetLinkData, LinkData } from "./common";
import { WikidataReader } from "./wd_read";
import { addItemClaim, addReference } from "./wd_write";

let port: any  = null;
function openPort(conn: any) {
    port = conn;
    port.onMessage.addListener(portHandler);
    wdr.getProps().then((props: any) => port.postMessage({
        props: props
    }));
}

chrome.runtime.onConnect.addListener(openPort);

function onNewItem(url: string, body: any) {
    port.postMessage({title: url, body: body});
}

let wdr = new WikidataReader(onNewItem);

function portHandler(msg: BackgroundRequest) {
    switch(msg.reqType) {
        case RequestType.GET_WD_IDS:
            wdr.lookupWikiUrls(msg.payload.urls, msg.payload.full);
    }
}


chrome.runtime.onMessage.addListener(messageHandler);


function messageHandler(msg: BackgroundRequest, sender: any, reply: any) {
    switch(msg.reqType) {           
        case RequestType.GET_PROP_REC:
            return getPropRecs(msg.payload.entity, msg.payload.text, reply);
        case RequestType.ADD_CLAIM:
            addClaimAndRef(msg.payload).then(() => reply(true));
            //addItemClaim(msg.payload.sourceItem, msg.payload.property, msg.payload.targetItem).then((v) => reply(v));
            return true
    }
    return false;
}

chrome.runtime.onMessage.addListener(messageHandler);

async function addClaimAndRef(claim: AddClaim) {
    let res = await addItemClaim(claim.sourceItem, claim.property, claim.targetItem);
    //"{"pageinfo":{"lastrevid":1304825547},"success":1,"claim":{"mainsnak":{"snaktype":"value","property":"P113","hash":"c0db0d5ef5b9c88da2489eaf107f67a14b4287ad","datavalue":{"value":{"entity-type":"item","numeric-id":9064,"id":"Q9064"},"type":"wikibase-entityid"},"datatype":"wikibase-item"},"type":"statement","id":"Q4836308$13A1BD63-B66F-4730-B2C0-8B53B85A92CB","rank":"normal"}}"
    if (res && res.success) {
        let claim_id = res.claim.id;
        addReference(claim, claim_id);
    }
}

function getPropRecs(item: string, text: string, reply: any) {
    let BASE_URL = "https://www.wikidata.org/w/api.php?action=wbsgetsuggestions&format=json&context=item";
    let full_url = BASE_URL + "&entity=" + encodeURIComponent(item) + "&search=" + encodeURIComponent(text);
    fetch(full_url).then((x) =>x.json()).then((x) => {
        reply(x);
    });
    return true;
}
