import { MessageType, Message, GetLinkIdentifierReply} from "../messageBroker";
import {exposeWikiVariables, isExposed} from "../exposeVariables";
import {WwwyzzerddHolder} from "./holder"
import React from "react";
import ReactDom from "react-dom";

const wikiLinkRegex = new RegExp("^https?:\/\/([a-z]+)\.(?:m\.)?wikipedia\.org\/wiki\/([^#]+)", "i");
// don't allow anything after the QID to prevent edit links
const wikidataLinkRegex = new RegExp("^https?:\/\/(([a-z]+)\.)?(?:m\.)?wikidata\.org\/wiki\/(Q\\d+)$", "i");
const wikiExpandedRegex = new RegExp("^https?:\/\/[a-z]+\.(?:m\.)?(wikipedia|wikidata)\.org.+", "i");
let bootstrapped = false;

/**
 * 
 * @returns the permalink of the current pages URL (containing oldid)
 */
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
    let bodyLinkElms = Array.from(document.querySelectorAll("#mw-content-text a"));
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
            // don't operate links to images
            if (!link.classList.contains("image")) {
                fn(link as HTMLAnchorElement)
            }
        }
    }
}

function isWikiLink(link:HTMLAnchorElement): boolean {
    const hrefString = link.getAttribute("href") || "";
    return !!(link.href && (!hrefString.startsWith("#")) && wikiLinkRegex.exec(link.href));
}

function isWikidataLink(link:HTMLAnchorElement): boolean {
    const hrefString = link.getAttribute("href") || "";
    return !!(link.href && (!hrefString.startsWith("#")) && wikidataLinkRegex.exec(link.href));
}

function isNotWikiLink(link:HTMLAnchorElement): boolean {
    const hrefString = link.getAttribute("href") || "";
    if (hrefString == "") {
        return false;
    }
    return (!hrefString.startsWith("#") && !wikiExpandedRegex.exec(link.href));
}


function operateWikiLinks(fn: (link:HTMLAnchorElement) => void) {
    operateLinks((link) => {
        if (isWikiLink(link)) {
            fn(link);
        }
    });
}

function operateWikidataLinks(fn: (link:HTMLAnchorElement) => void) {
    operateLinks((link) => {
        if (isWikidataLink(link)) {
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

function getWikiLanguage(url: string): string | undefined {
    let m = wikiLinkRegex.exec(url);
    if(m && m.length > 1) {
        const lang = m[1].toLowerCase();
        return lang;
    }
    return undefined;
}

interface Coordinate {
    lat: number;
    lon: number;
}

const decimalCoordRegex = new RegExp(".*\/\/geohack\.toolforge\.org\/geohack\.php\\?(?:pagename=(?:.*)&)?params=([\\d.-]+_[NS])_([\\d.-]+_[WE])", "i")
const secondsCoordRegex = new RegExp(".*\/\/geohack\.toolforge\.org\/geohack\.php\\?(?:pagename=(?:.*)&)?params=(\\d+)_(\\d+)_([\\d.]+)_([NS])_(\\d+)_(\\d+)_([\\d.]+)_([WE])", "i")

function findCoordinate(href: string): undefined | Coordinate  {
    // WARNING: for now keep this functionality disabled
    return;
    /*
    let match = decimalCoordRegex.exec(href);
    if (match) {
        let latSign = 1;
        let lonSign = 1;
        if (match[1].endsWith("S")) {
            latSign = -1;
        }
        if (match[2].endsWith("W")) {
            lonSign = -1;
        }
        let lat = Number.parseFloat(match[1]) * latSign;
        let lon = Number.parseFloat(match[2]) * lonSign;
        return {
            lat: lat,
            lon: lon
        };
    }
    match = secondsCoordRegex.exec(href);
    if (match) {
        let latSign = 1;
        let lonSign = 1;
        if (match[4].endsWith("S")) {
            latSign = -1;
        }
        if (match[8].endsWith("W")) {
            lonSign = -1;
        }
        let lat = Number.parseFloat(match[1]);
        lat += Number.parseFloat(match[2]) / 60.0;
        lat += Number.parseFloat(match[3]) / 60.0 / 60.0;
        let lon = Number.parseFloat(match[5]);
        lon += Number.parseFloat(match[6]) / 60.0;
        lon += Number.parseFloat(match[7]) / 60.0 / 60.0;
        return {
            lat: lat * latSign,
            lon: lon * lonSign
        };
    }
    return;
    */
}


function boot() {
    if (bootstrapped) {
        // already booted
        return;
    }

    if (!isExposed()) {
        let func = exposeWikiVariables.toString();

        const j = document.createElement('script');
        const f = document.getElementsByTagName('script')[0];
        if (f && f.parentNode) {
            j.textContent = "let ww_bootFunc = " + func + "\n; ww_bootFunc();"
            f.parentNode.insertBefore(j, f);
            f.parentNode.removeChild(j);
        }
        (window as any).booted = true;
    }

    const wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";
    const wikiUserLang = document.getElementsByTagName("body")[0].getAttribute("mw-lang") || "";
    const pageId = parseInt(document.getElementsByTagName("body")[0].getAttribute("mw-page-id") || "") ;
    const isPage = document.getElementsByTagName("body")[0].getAttribute("mw-is-page") === "true";
    const pageName = (document.getElementsByTagName("body")[0].getAttribute("mw-page-name") || "").replaceAll("_", " ",);

    const wikiLang = getWikiLanguage(document.baseURI);
    if (isPage && wikiNamespace == "0" && pageName !== "Main Page") {
        let footer = document.querySelectorAll("#footer")[0] || document.getElementsByTagName("body")[0];
        let holder = document.createElement("div");
        footer.appendChild(holder);
        function setRef(ref: WwwyzzerddHolder) {

            if (!ref) {
                console.error("Unmounting wwwyzzerrdd");
                return;
            }

            // pass the title bar to the holder
            let titleBox: HTMLHeadingElement | null = document.querySelector("h1#firstHeading");
            if (titleBox) {
                let box = document.createElement("span");
                titleBox.appendChild(box);
                ref.addTitleBox(box);
            }

            // pass the wiki links to the holder
            operateWikiLinks(function(link:HTMLAnchorElement) {
                // clone the anchor into itself to make a place for the orb
                let linkAnchor  = link as HTMLAnchorElement;
                let origLink = linkAnchor.cloneNode(true) as HTMLAnchorElement;
                linkAnchor.removeAttribute("href");
                // used for debugging
                linkAnchor.setAttribute("data-x-wwwyzzerdd", "wiki-holder-element");
                linkAnchor.innerHTML = '';
                linkAnchor.innerText = "";
                linkAnchor.className = "";
                linkAnchor.appendChild(origLink);

                ref.addWikiLink(origLink.href, linkAnchor);
            });

            operateWikidataLinks(function(link:HTMLAnchorElement) {
                // clone the anchor into itself to make a place for the orb
                let linkAnchor  = link as HTMLAnchorElement;
                let origLink = linkAnchor.cloneNode(true) as HTMLAnchorElement;
                linkAnchor.removeAttribute("href");
                // used for debugging
                linkAnchor.setAttribute("data-x-wwwyzzerdd", "wiki-holder-element");
                linkAnchor.innerHTML = '';
                linkAnchor.innerText = "";
                linkAnchor.className = "";
                linkAnchor.appendChild(origLink);

                ref.addWikidataLink(origLink.href, linkAnchor);
            });


            operateNonWikiLinks(function(link:HTMLAnchorElement) {
                // clone the anchor into itself to make a place for the orb
                let linkAnchor  = link as HTMLAnchorElement;
                let origLink = linkAnchor.cloneNode(true) as HTMLAnchorElement;
                linkAnchor.removeAttribute("href");
                linkAnchor.innerHTML = '';
                linkAnchor.innerText = "";
                linkAnchor.className = "";
                linkAnchor.appendChild(origLink);
                linkAnchor.setAttribute("data-x-wwwyzzerdd", "ext-holder-element");
                let latlonMatch = findCoordinate(origLink.href);
                if (latlonMatch) {
                    ref.addCoordLink(latlonMatch.lat, latlonMatch. lon, linkAnchor);
                } else {
                    ref.broker.sendFrontendRequest({
                        type: MessageType.GET_LINK_ID,
                        payload: {
                            url: origLink.href
                        }
                    }, (resp: Message) => {
                        const payload = resp.payload as GetLinkIdentifierReply;
                        if (payload.match) {
                            ref.addExternalLink(payload.match.prop, payload.match.identifier, linkAnchor, payload.match.caseInsensitive);
                        }
                    });
                }
            });

            ref.boot();
        }
        const elm = <div><WwwyzzerddHolder pageName={pageName} wikiLanguage={wikiLang} userLanguage={wikiUserLang} pageId={pageId} curUrl={getSourceUrl()} wikiLinks={[]} ref={setRef} /></div>;
        ReactDom.render(elm, holder);
        bootstrapped = true;
    } else {
        if (!isPage) {
            console.log("Trying Wwwyzzerdd boot again.");
            setTimeout(boot, 500);
        } else {
            console.log("Not running wwwyzzerdd.");
        }
    }
}

window.addEventListener("load", boot);

if (document.readyState == "complete") {
    boot();
}
