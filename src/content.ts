import { BackgroundRequest, RequestType, LinkData } from "./common";
import Popper from 'popper.js';


import 'bootstrap';
import {Popover, Tooltip} from 'bootstrap'
import 'jquery';
import * as $ from "jquery";

let port = chrome.runtime.connect();

port.onMessage.addListener(itemListener);

let linkedItems: { [key: string]: any[]; } = {};
let propDescs: { [key: string]: any; } = {};
let curUrl = new URL(document.baseURI);

function fixedEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(/[!'*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}


function itemListener(msg: any) {
    if ("props" in msg) {
        propDescs = msg.props;
        return;
    }
    let qid = msg.body.title;
    console.log(msg.title, qid);
    if (curUrl.pathname.endsWith("wiki/" + fixedEncodeURIComponent(msg.title))) {
        document.body.setAttribute("qid", qid);
        extractLinkedItems(msg.body.claims);
    }
    var count = 0;
    for (let l of linkElms) {
        let href = l.getAttribute("href") || "";
        if (href.endsWith("wiki/" + fixedEncodeURIComponent(msg.title)) ||
            href.endsWith("wiki/" + msg.title)) {
            markupLink(l, msg.body);
            count += 1;
        }
    }
    if (count == 0) {
       // console.log("no match", msg);
    }
}

function extractLinkedItems(claims: any) {
    for (let prop of Object.keys(claims)) {
        for (let claim of claims[prop]) {
            if (claim['type'] == 'statement' && claim['mainsnak']["datatype"] == ["wikibase-item"]) {
                let linkedItem = claim['mainsnak']["datavalue"]["value"]["id"];
                if (!(linkedItem in linkedItems)) {
                    linkedItems[linkedItem] = [];
                }
                linkedItems[linkedItem].push(prop);
            }
        }
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

                    chrome.runtime.sendMessage({
                        reqType: RequestType.ADD_CLAIM,
                        payload: {
                            sourceItem: qid,
                            property: pid,
                            targetItem: targetQid
                        }
                    });
                    
                    console.log(`saving link: ${qid} - ${pid} - ${targetQid}`);
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
    popDiv.appendChild(input)
    let buttonDiv = document.createElement('div');
    buttonDiv.setAttribute("id", "prop-options");
    buttonDiv.classList.add("d-flex");
    buttonDiv.classList.add("p-1");
    buttonDiv.classList.add("text-center");
    buttonDiv.classList.add("flex-column");    
    popDiv.appendChild(buttonDiv)
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
    }    
}

function makeContextMenu(d: any) {
    function contextMenu(evt: any): boolean {
        evt.preventDefault();
        popDiv.setAttribute("qid", d.title);
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
        searchProp({target: popDiv.children[0]});
        return false;
    }
    return contextMenu;
}

let linkElms = Array.from(document.querySelectorAll("#bodyContent a[href*='/wiki/']"));
let links = [window.location.href].concat(
    linkElms.flatMap((e) => e.getAttribute("href") || [])
        .map((url) => new URL(url, document.baseURI).href));


function boot() {
    if (document.baseURI.indexOf("wiki/Special:") < 0) {
        linkElms.forEach((l: any) => l.setAttribute("title", ""));
        port.postMessage({
            reqType: RequestType.GET_WD_IDS,
            payload: {urls: [window.location.href], full: true}
        });
        port.postMessage({
            reqType: RequestType.GET_WD_IDS,
            payload: {urls: links, full: false}
        });
    }
}

boot();

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
       link.classList.add("badge-success");
       link.setAttribute("data-toggle","tooltip");
       for (let pid of new Set(linkedItems[qid])) {
           let curTitle = link.getAttribute("title") || "";
            if (pid in propDescs) {
                link.setAttribute("title", appendString(curTitle, propDescs[pid]));
            } else {
                link.setAttribute("title", appendString(curTitle, pid));
            }
        }
        new Tooltip(link);
    } else {
        link.classList.add("badge-info");
    }
}
