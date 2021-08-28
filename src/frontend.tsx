import {registerFrontendBroker, MessageType, Message, GetLinkIdentifierReply} from "./messageBroker";

import {WwwyzzerddHolder} from "./holder"
import React from "react";
import ReactDom from "react-dom";

let broker = registerFrontendBroker();

let htmlElement = document.getElementsByTagName("html")[0];
const linksRegisteredEvent = new Event('links-registered');
const bootEvent = new Event('wwwyzzerdd-boot');


const wikiLinkRegex = new RegExp("^https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/([^#]+)", "i");
const wikiExpandedRegex = new RegExp("^https?:\/\/[a-z]+\.wikipedia\.org.+", "i");
let booted = false;

function exposeNamespace() {
     if (!booted) {
        if (document.readyState == "complete") {
            const j = document.createElement('script');
            const f = document.getElementsByTagName('script')[0];
            if(f && f.parentNode) {
                j.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-ns\", mw.config.get('wgNamespaceNumber' ));";
                f.parentNode.insertBefore(j, f);
                f.parentNode.removeChild(j);
            }
            booted = true;
            htmlElement.dispatchEvent(bootEvent);
        }
      }
}
  

function getSourceUrl(): string {
    let link = document.querySelector("#t-permalink a")
    if (link) {
        return (link as HTMLAnchorElement).href;
    } else {
        return document.baseURI;
    }
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
            fn(link as HTMLAnchorElement);
        }
    });

}

const bannedPrefixes: string[] = ["File:", "Template:", "Special:", "Template talk:", "Help:", "Wikipedia:", "Talk:", "Category:"];

function parseWikiUrl(url: string): string | undefined {
    let m = wikiLinkRegex.exec(url);
    if(m && m.length > 1) {
        const title = decodeURIComponent(m[2]).replaceAll("_", " ");
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

function getWikiLanguage(url: string): string | undefined {
    let m = wikiLinkRegex.exec(url);
    if(m && m.length > 1) {
        const lang = m[1].toLowerCase();
        return lang;
    }
    return undefined;
}

function boot() {
    const wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";
    const wikiLang = getWikiLanguage(document.baseURI);
    const wikiPage = parseWikiUrl(document.baseURI);
    if (wikiLang == "en" && wikiNamespace == "0" && wikiPage != "Main Page") {
        let footer = document.querySelectorAll("#footer")[0];    
        function setRef(ref: WwwyzzerddHolder) {
            console.log(ref);
            operateWikiLinks(function(link:HTMLAnchorElement) {
                // clone the anchor into itself to make a place for the orb
                let linkAnchor  = link as HTMLAnchorElement;
                let origLink = linkAnchor.cloneNode(true) as HTMLAnchorElement;
                linkAnchor.removeAttribute("href");
                for (let c of linkAnchor.childNodes) {
                    linkAnchor.removeChild(c);
                }
                linkAnchor.innerText = "";
                linkAnchor.className = "";
                linkAnchor.appendChild(origLink);

                ref.addWikiLink(origLink.href, linkAnchor);
            });


            operateNonWikiLinks(function(link:HTMLAnchorElement) {
                // clone the anchor into itself to make a place for the orb
                let linkAnchor  = link as HTMLAnchorElement;
                let origLink = linkAnchor.cloneNode(true) as HTMLAnchorElement;
                linkAnchor.removeAttribute("href");
                for (let c of linkAnchor.childNodes) {
                    linkAnchor.removeChild(c);
                }
                linkAnchor.innerText = "";
                linkAnchor.className = "";
                linkAnchor.appendChild(origLink);

                broker.sendFrontendRequest({
                    type: MessageType.GET_LINK_ID,
                    payload: {
                        url: origLink.href
                    }
                }, (resp: Message) => {
                    const payload = resp.payload as GetLinkIdentifierReply;
                    if (payload.match) {
                        ref.addExternalLink(payload.match.prop, payload.match.identifier, linkAnchor);
                    }
                });
            });

            ref.boot();
        }
        const elm = <div><WwwyzzerddHolder curUrl={getSourceUrl()} pageTitle="foo" wikiLinks={[]} ref={setRef} /></div>;
        ReactDom.render(elm, footer);
    }
}

htmlElement.addEventListener(bootEvent.type, boot);

document.onreadystatechange = exposeNamespace;
if (document.readyState == "complete") {
    exposeNamespace();    
}
