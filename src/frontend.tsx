
import {registerFrontendBroker, MessageType, Message, GetQidsReply, GetClaimsReply, GetPropNamesReply, GetLinkIdentifierReply} from "./messageBroker";
import {WWWLink} from "./component"
import React from "react";
import ReactDom from "react-dom";
import {PropertySuggestions} from "./propertyData";


let broker = registerFrontendBroker();
let components: JSX.Element[] = [];
let targets: Element[] = [];
let claims: {[key: string]: any} = {};
let propNames: {[key: string]: any} = {};
let pageQid: {[key: string]: string} = {};


const debug = true;

if (debug) {
    broker.registerFrontendHandler(MessageType.GET_QIDS, console.log);
    broker.registerFrontendHandler(MessageType.GET_CLAIMS, console.log);
    broker.registerFrontendHandler(MessageType.GET_PROP_NAMES, console.log);
    broker.registerFrontendHandler(MessageType.GET_PROP_SUGGESTIONS, console.log);
}

broker.registerFrontendHandler(MessageType.GET_CLAIMS, function(data: GetClaimsReply) {
  Object.assign(claims, data.claims)
  for (let i = 0; i < components.length; i += 1) {
      ReactDom.unmountComponentAtNode(targets[i]);
      ReactDom.render(components[i], targets[i]);
  }
});

broker.registerFrontendHandler(MessageType.GET_PROP_NAMES, function(data: GetPropNamesReply) {
    Object.assign(propNames, data.propNames)
    for (let i = 0; i < components.length; i += 1) {
        ReactDom.unmountComponentAtNode(targets[i]);
        ReactDom.render(components[i], targets[i]);
    }
});
  

const linksRegisteredEvent = new Event('links-registered');


const wikiLinkRegex = new RegExp("^https?:\/\/[a-z]+\.wikipedia\.org\/wiki\/([^#]+)", "i");
const wikiExpandedRegex = new RegExp("^https?:\/\/[a-z]+\.wikipedia\.org.+", "i");


function exposeNamespace() {
    const j = document.createElement('script');
    const f = document.getElementsByTagName('script')[0];
    if(f && f.parentNode) {
        j.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-ns\", mw.config.get('wgNamespaceNumber' ));";
        f.parentNode.insertBefore(j, f);
        f.parentNode.removeChild(j);
    }
}
  
exposeNamespace();

function getSourceUrl(): string {
    let link = document.querySelector("#t-permalink a")
    if (link) {
        return (link as HTMLAnchorElement).href;
    } else {
        return document.baseURI;
    }
}

function addClaim(sourceQid: string, prop: string, targetQid: string) {
    const addPromise = new Promise(function(resolve) {
        broker.sendFrontendRequest({
            type: MessageType.SET_PROP_QID,
            payload: {
                sourceItemQid: sourceQid,
                propId: prop,
                targetItemQid: targetQid,
                sourceUrl: getSourceUrl()
            }
        }, resolve);
    });
    addPromise.then((p) => {
        getBodyClaims();
    });
    
    return addPromise;
}

function addIdClaim(sourceQid: string, prop: string, targetId: string) {
    const addPromise = new Promise(function(resolve) {
        broker.sendFrontendRequest({
            type: MessageType.SET_PROP_ID,
            payload: {
                sourceItemQid: sourceQid,
                propId: prop,
                targetId: targetId,
                sourceUrl: getSourceUrl()
            }
        }, resolve);
    });
    addPromise.then((p) => {
        getBodyClaims();
    });
    
    return addPromise;
}


function getSuggestion(qid: string, typed: string): Promise<PropertySuggestions> {
    return new Promise(function(resolve) {
        broker.sendFrontendRequest({
            type: MessageType.GET_PROP_SUGGESTIONS,
            payload: {
                itemQid: qid,
                typed
            }
        }, resolve);
    });
}

function operateLinks(fn: (link:HTMLAnchorElement) => void) {
    let navBoxes = Array.from(document.querySelectorAll("#bodyContent .navbox"));
    let bodyLinkElms = Array.from(document.querySelectorAll("#bodyContent a"));
    for(const link of bodyLinkElms) {        
        // skip links in nav boxes for now
        let notInNav = true;
        for (const navBox of navBoxes) {
            if ((navBox.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_CONTAINED_BY) > 0) {
                notInNav = false;
                break;
            }
        }
        if (notInNav) {
            fn(link as HTMLAnchorElement)
        }
    }
}

function isWikiLink(link:HTMLAnchorElement): boolean {
    const hrefString = link.getAttribute("href") || "";
    return !!(link.href && (!hrefString.startsWith("#")) && wikiLinkRegex.exec(link.href));
}

function isNotWikiLink(link:HTMLAnchorElement): boolean {
    const hrefString = link.getAttribute("href") || "";
    return (!hrefString.startsWith("#") && !wikiExpandedRegex.exec(link.href));
}


function operateWikiLinks(fn: (link:HTMLAnchorElement) => void) {
    operateLinks((link) => {
        if (isWikiLink(link)) {
            fn(link);
        }
    });
}

function operateNonWikiLinks(fn: (link:HTMLAnchorElement) => void) {

    operateLinks((link) => {
        if (isNotWikiLink(link)) {
            fn(link);
        }
    });
}



const bannedPrefixes: string[] = ["File:", "Template:", "Special:", "Template talk:", "Help:", "Wikipedia:", "Talk:", "Category:"];

function parseWikiUrl(url: string): string | undefined {
    let m = wikiLinkRegex.exec(url);
    if(m && m.length > 1) {

        const title = decodeURIComponent(m[1]).replaceAll("_", " ");
        for (const p of bannedPrefixes) {
            if (title.startsWith(p)) {
                return undefined;
            }
        }
        
        return title;
    } else {
        return undefined;
    }
}

function annotateWikiLinks() {

    let curTitle = parseWikiUrl(document.baseURI);
    let titles: string[] = curTitle ? [curTitle] : [];
    let ids: string[] = [];

    operateWikiLinks((link) => {
        const randId = "wd_" + Math.floor(Math.random() * 10000000);
        link.setAttribute("id", randId);

        const title = parseWikiUrl(link.href);
        if (title) {
            link.setAttribute("wd_title", title);
            titles.push(title);
        }
    });
    broker.sendMessage({
        type: MessageType.GET_QIDS,
        payload: {
            titles
        }
    });

}

function annotateIdLinks() {
    operateNonWikiLinks((link) => {
        const url = link.href;
        if (url) {
            broker.sendFrontendRequest({
                type: MessageType.GET_LINK_ID,
                payload: {
                    url:url
                }
            }, (resp: Message) => {
                const payload = resp.payload as GetLinkIdentifierReply;
                if (payload.match !== undefined) {
                    link.setAttribute("pid", payload.match.prop);
                    link.setAttribute("pid_identifier", payload.match.identifier);      
                    let linkHref = link.href;
                    let linkHtml = link.innerHTML;              
                    const elm = <WWWLink 
                        pageQid={pageQid} 
                        addClaim={addClaim}
                        addIdClaim={addIdClaim}
                        getSuggestion={getSuggestion} 
                        propNames={propNames} 
                        claims={claims} 
                        label={payload.match.identifier} 
                        linkHref={linkHref}
                        qid={undefined}
                        forcePid={payload.match.prop}
                        description={undefined}
                        linkElm={linkHtml}/>;
                    // race condition! fun!
                    components.push(elm);
                    targets.push(link);
                    ReactDom.render(elm, link);
                    link.removeAttribute("href");
                }                
            })
        }
    });
}


function handleQids(payload: GetQidsReply) {
    let curTitle = parseWikiUrl(document.baseURI);
    for (let title of Object.keys(payload.data)) {
        
        let {qid, label, description} = payload.data[title];
        // handle the current page
        if (title == curTitle) {
            const body = document.querySelector("#bodyContent");
            if (body) {
                body.setAttribute("qid", qid);
                pageQid["qid"] = qid;
                getBodyClaims();
            }
        }
        // handle all links
        let links = Array.from(document.querySelectorAll(`#bodyContent a[wd_title='${title.replaceAll("'","\\'")}']`));
        for (let link of links) {
            let anchorLink = (link as HTMLAnchorElement);
            let linkHtml = anchorLink.innerHTML;
            let linkHref = anchorLink.href;
            anchorLink.setAttribute("qid", qid);
            const elm = <WWWLink 
                pageQid={pageQid} 
                addClaim={addClaim} 
                getSuggestion={getSuggestion} 
                propNames={propNames} 
                claims={claims} 
                label={label} 
                description={description} 
                addIdClaim={addIdClaim}
                qid={qid} 
                linkHref={linkHref}
                linkElm={linkHtml}/>;
            components.push(elm);
            targets.push(link);
            ReactDom.render(elm, link);
            anchorLink.removeAttribute("href");
        }
    }

    const body = document.querySelector("#bodyContent");
    if(body) {
        body.dispatchEvent(linksRegisteredEvent);
    }
    
}

function registerEvents() {
    broker.registerFrontendHandler(MessageType.GET_QIDS, handleQids);
    broker.sendMessage({type: MessageType.GET_PROP_NAMES, payload: {}});
    const body = document.querySelector("#bodyContent");
    if(body) {
        body.addEventListener('links-registered', console.log);
    }
}

function getBodyClaims() {
    const body = document.querySelector("#bodyContent");
    if (body) {
        const qid = body.getAttribute("qid");
        if (qid) {
          broker.sendMessage({
                type: MessageType.GET_CLAIMS,
                payload: {
                    qid
                }
            })
        }
    }
}

let wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";

if (wikiNamespace == "0" && parseWikiUrl(document.baseURI) != "Main Page") {
    registerEvents();
    annotateWikiLinks();
    annotateIdLinks();
}

