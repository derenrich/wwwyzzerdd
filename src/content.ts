import { BackgroundRequest, RequestType, LinkData } from "./common";
import {matchLinks} from "./external_id_handler";
import 'bootstrap';
import {Popover, Tooltip} from 'bootstrap'
import 'jquery';
//import * as $ from "jquery";

function exposeNamespace() {
  const j = document.createElement('script'),
    f = document.getElementsByTagName('script')[0];
  j.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-ns\", mw.config.get('wgNamespaceNumber' ));";
  f.parentNode.insertBefore(j, f);
  f.parentNode.removeChild(j);
}

exposeNamespace();
   
let linkedItems: { [key: string]: any[]; } = {};
let propDescs: { [key: string]: any; } = {};
let curUrl = new URL(document.baseURI);

function fixedEncodeURIComponent(str: string) {
    return str.replace(/[^a-zA-Z:,_0-9()!$*./;@-]/g, function(c) {
        return encodeURIComponent(c);
    }).replace(/['+]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
}


async function itemListener(msg: any) {
    console.log(msg);
    if ("props" in msg) {
        propDescs = msg.props;
        return;
    }
    if ("icons" in msg) {
        console.log(msg.icons);
        return;
    }
    if ("regex" in msg) {
        matchLinks(msg.regex);
        return;
    }
    let qid = msg.body.title;
    if (curUrl.pathname.endsWith("wiki/" + fixedEncodeURIComponent(msg.title)) && msg.body.claims) {
        // this is info about this page
        document.body.setAttribute("qid", qid);
        extractLinkedItems(msg.body.claims);
        for (let l of linkElms) {
            let qid = l.getAttribute("qid");
            //console.log(l, qid);
            if (qid) {
                addTooltip(l, qid);
            }
        }
        for (let l of allLinkElms) {
            visitLink(l);
        }        
    } else {
        // this is info about a link
        for (let l of linkElms) {
            let href = l.getAttribute("href") || "";
            if (href.endsWith("wiki/" + fixedEncodeURIComponent(msg.title)) ||
                href.endsWith("wiki/" + msg.title)) {
                markupLink(l, msg.body);
            }
        }
    }
}
var port = null;
try {
    let wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";
    if (wikiNamespace == "0") {
        port = chrome.runtime.connect();
        port.onMessage.addListener(itemListener);        
    }  else {
        console.log("not running", wikiNamespace);
    }
} catch (e) {
    console.log("not running", e);
}


function extractLinkedItems(claims: any) {
    for (let prop of Object.keys(claims)) {
        for (let claim of claims[prop]) {
            if (claim['type'] == 'statement' &&
                (claim['rank'] == 'normal' || claim['rank'] == 'preferred') &&
                claim['mainsnak']['snaktype'] == "value") {
                if (claim['mainsnak']["datatype"] == ["wikibase-item"]) {
                    let linkedItem = claim['mainsnak']["datavalue"]["value"]["id"];
                    if (!(linkedItem in linkedItems)) {
                        linkedItems[linkedItem] = [];
                    }
                    linkedItems[linkedItem].push(prop);
                } else if(claim['mainsnak']["datatype"] == "commonsMedia") {
                    // dump the filename in
                    let linkedItem = claim['mainsnak']["datavalue"]["value"];
                    if (!(linkedItem in linkedItems)) {
                        linkedItems[linkedItem] = [];
                    }
                    linkedItems[linkedItem].push(prop);
                } else if(claim['mainsnak']["datatype"] == "external-id") {
                    let linkedItemValue = claim['mainsnak']["datavalue"]["value"];
                    let linkedItemKey = prop + "::" + linkedItemValue;
                    linkedItems[linkedItemKey] = [true];
                }
            }
        }
    }
}

function getSourceUrl(): (string | null) {
    let link = document.querySelector("#t-permalink a")
    if (link) {
        return (link as HTMLAnchorElement).href;
    } else {
        return null;
    }
}

function searchProp(evt: any) {
    chrome.runtime.sendMessage({
        reqType: RequestType.GET_PROP_REC,
        payload: {entity: document.body.getAttribute("qid"), text: evt.target.value}
    }, (res: any) => {
        if (res && res.success) {
            let optionDiv = document.getElementById("prop-options");
            if (optionDiv) {
            optionDiv.innerHTML = "";
            for (let prop of res.search) {
                let button = document.createElement('button');
                button.type = "button";
                button.classList.add("btn");
                button.classList.add("btn-outline-primary");
                button.classList.add("btn-lg");                   
                button.textContent = prop.label;
                button.setAttribute("pid", prop.id);
                button.onclick = (evt) => {
                    let qid = document.body.getAttribute("qid");
                    let pid = prop.id;
                    let targetQid = popDiv.getAttribute("qid");
                    let idKey = popDiv.getAttribute("idKey");
                    chrome.runtime.sendMessage({
                        reqType: RequestType.ADD_CLAIM,
                        payload: {
                            sourceItem: qid,
                            property: pid,
                            targetItem: targetQid,
                            targetString: idKey,
                            sourceUrl: getSourceUrl()
                        }
                    }, (res: any) => {
                        //console.log("return", res);
                        if (res) { loadProps(); }
                    });
                    
                    //console.log(`saving link: ${qid} - ${pid} - ${targetQid}`);
                    dismissPopover();
                }
                let row = document.createElement("div");
                row.classList.add("d-flex");
                row.classList.add("flex-row");
                row.classList.add("justify-content-center");
                row.appendChild(button);
                optionDiv.appendChild(row);
            }
            }
        }
    });
}

function makePopDiv() {
    let popDiv = document.createElement('div');
    popDiv.onclick = (evt) => {
        evt.stopPropagation();
    }
    let input = document.createElement("input");
    input.type = "text";
    input.setAttribute("class", "form-control");
    popDiv.appendChild(input);
    let buttonDiv = document.createElement('div');
    buttonDiv.setAttribute("id", "prop-options");
    buttonDiv.classList.add("d-flex");
    buttonDiv.classList.add("p-1");
    buttonDiv.classList.add("text-center");
    buttonDiv.classList.add("flex-column");    
    popDiv.appendChild(buttonDiv);
    input.oninput = searchProp;
    return popDiv;
}

let popDiv = makePopDiv();

let curPopover: (Popover | null) = null;

document.body.onclick = (e) => {
    dismissPopover();
};

function dismissPopover() {
    if (curPopover) {
        curPopover.hide();
        (popDiv.children[0] as HTMLInputElement).value = "";
        (popDiv.children[0] as HTMLInputElement).disabled = false;        
        (popDiv.children[1] as HTMLDivElement).innerHTML = "";
    }    
}

function makeContextMenu(d: any, restrictedPid?:string) {
    function contextMenu(evt: any): boolean {
        evt.preventDefault();
        popDiv.setAttribute("qid", d.title);
        if (d.idKey) {
            popDiv.setAttribute("idKey", d.idKey);
        }
        dismissPopover();
        curPopover = new Popover(evt.target, {
            content: popDiv,
            placement: "right",
            trigger: "manual",
            sanitize: false,
            html:true,
            title: d.labels.en.value
        });
        curPopover.show();
        if (restrictedPid) {
            (popDiv.children[0] as HTMLInputElement).value = restrictedPid;
            (popDiv.children[0] as HTMLInputElement).disabled = true;
        }
        searchProp({target: popDiv.children[0]});
        return false;
    }
    return contextMenu;
}

let allLinkElms = Array.from(document.querySelectorAll("#bodyContent a"));
let linkElms = Array.from(document.querySelectorAll("#bodyContent a[href*='/wiki/']"));
let links = [window.location.href].concat(
    linkElms.flatMap((e) => e.getAttribute("href") || [])
        .map((url) => new URL(url, document.baseURI).href));


function loadProps() {
    // request a refresh of the entities properties
    port.postMessage({
        reqType: RequestType.GET_WD_IDS,
        payload: {urls: [window.location.href], full: true}
    });
}

function boot() {
    linkElms.forEach((l: any) => l.setAttribute("title", ""));
    loadProps();
    port.postMessage({
        reqType: RequestType.GET_WD_IDS,
        payload: {urls: links, full: false}
    });
}
if (port) {
    boot();
}

function appendString(title: string, ap: string): string {
    if (title) {
        return title + " & " + ap;
    } else {
        return ap;
    }
}

function markupLink(link: Element, resp: any) {
    let qid = resp.title;
    link.setAttribute("qid", qid);
    link.addEventListener("contextmenu", makeContextMenu(resp));
    link.classList.add("badge");
    addTooltip(link, qid);
 }


function addTooltip(link: Element, qid: string) {
    if (qid in linkedItems) {
       link.classList.remove("badge-info");
       link.classList.add("badge-success");
       link.setAttribute("data-toggle","tooltip");
       let curTitle = link.setAttribute("wd-prop", "");
       for (let pid of new Set(linkedItems[qid])) {
           let curTitle = link.getAttribute("wd-prop") || "";
            if (pid in propDescs) {
                link.setAttribute("wd-prop", appendString(curTitle, propDescs[pid]));
            } else {
                link.setAttribute("wd-prop", appendString(curTitle, pid));
            }
       }
       new Tooltip(link, {title: function(){ return this.getAttribute("wd-prop") || "" ;}});
    } else {
        link.classList.remove("badge-success");
        link.classList.add("badge-info");
    }
}

function visitLink(link: Element) {
    // is this an autosuggested link?
    let idProp = link.getAttribute("wd-prop-id");
    let idValue = link.getAttribute("wd-key");
    if (idProp && idValue) {
        let ignoreCase = link.getAttribute("wd-prop-ignorecase");
        let checker = idProp + "::" + idValue;
        var match = false;
        if (!ignoreCase && checker in linkedItems) {
            match = true;
        } else if (!Object.keys(linkedItems).every(v => v.localeCompare(checker, undefined, {sensitivity: "accent"}) != 0)) {
            match = true;
        }
        if (match) {
            link.classList.add("badge-success");
            let propName = propDescs[idProp]
            new Tooltip(link, {title: function(){ return propName;}});
        } else {          
            link.classList.add("badge-info");
            let resp = {title: "", idKey: idValue, labels: {en: {value: idValue}}};
            link.addEventListener("contextmenu", makeContextMenu(resp, idProp))
        }
    }
}
