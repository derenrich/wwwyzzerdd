import { BackgroundRequest, RequestType, LinkData } from "./common";
import Popper from 'popper.js';


import 'bootstrap';
import {Popover, Tooltip} from 'bootstrap'
import 'jquery';
import * as $ from "jquery";

function handleInput(evt: any) {
    console.log(evt);
    chrome.runtime.sendMessage({
        reqType: RequestType.GET_PROP_REC,
        payload: {entity: document.body.getAttribute("qid"), text: evt.target.value}
    }, (res: any) => {
        if (res.success) {
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
    input.oninput = handleInput;
    return popDiv;
}

let popDiv = makePopDiv();

function makeContextMenu(d: LinkData) {
    function contextMenu(evt: any): boolean {
        evt.preventDefault();
        console.log(d);
        console.log(evt);
        popDiv.setAttribute("qid", d.qid);
        let p = new Popover(evt.target, {content: popDiv, placement: "right", trigger: "manual", sanitize: false, html:true});
        p.show();
        handleInput({target: popDiv.children[0]});
        return false;
    }
    return contextMenu;
}

let linkElms = Array.from(document.querySelectorAll("#bodyContent a[href*='/wiki/']"));
let links = linkElms.flatMap((e) => e.getAttribute("href") || []).concat([window.location.href]);

links.push(window.location.href);
chrome.runtime.sendMessage({
    reqType: RequestType.GET_WD_IDS,
    payload: {urls: links}
}, handleReply);


function handleReply(resp: any) {
    if (resp) {
        // everything is ok        
        populateLinkedItems();        
        
    } else {
        console.log(resp);
        console.log("Failed to get data");
    }
}

let linkedItems: { [key: string]: any; } = {};
let propDescs: { [key: string]: any; } = {};

function populateLinkedItems() {
    chrome.runtime.sendMessage({
        reqType: RequestType.GET_LINK_DATA,
        payload: { url: window.location.href}
    }, function (resp: any) {
        console.log(resp);
        document.body.setAttribute("qid", resp.qid);
        for (let prop of Object.keys(resp.claims)) {
            for (let claim of resp.claims[prop]) {
                if (claim['type'] == 'statement' && claim['mainsnak']["datatype"] == ["wikibase-item"]) {
                    linkedItems[claim['mainsnak']["datavalue"]["value"]["id"]] = prop;
                }
            }
            chrome.runtime.sendMessage({
                reqType: RequestType.GET_PROP_DATA,
                payload: { prop: prop }
            }, function(propDesc: any) {
                propDescs[prop] = propDesc;
            });
        }
        markupLinks();
    });
}

function markupLinks() {
    for (let link of linkElms) {
        chrome.runtime.sendMessage({
            reqType: RequestType.GET_LINK_DATA,
            payload: { url: link.getAttribute("href")}
        }, function (resp: any) {
            if (resp) {
                link.addEventListener("contextmenu", makeContextMenu(resp));
                link.classList.add("badge");
                if (resp.qid in linkedItems) {
                    link.classList.add("badge-success");
                    link.setAttribute("data-toggle","tooltip");

                    if (linkedItems[resp.qid] in propDescs) {
                        link.setAttribute("title", propDescs[linkedItems[resp.qid]]);
                    } else {
                        link.setAttribute("title", linkedItems[resp.qid]);
                    }
                    new Tooltip(link);
                } else {
                    link.classList.add("badge-info");
                }
            }
        });
    }
}
