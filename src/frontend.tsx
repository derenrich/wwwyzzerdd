import {registerFrontendBroker, MessageType, Message, GetLinkIdentifierReply} from "./messageBroker";

import {WwwyzzerddHolder} from "./holder"
import React from "react";
import ReactDom from "react-dom";

let broker = registerFrontendBroker();

let htmlElement = document.getElementsByTagName("html")[0];
const linksRegisteredEvent = new Event('links-registered');
const bootEvent = new Event('wwwyzzerdd-boot');


const wikiLinkRegex = new RegExp("^https?:\/\/([a-z]+)\.(?:m\.)?wikipedia\.org\/wiki\/([^#]+)", "i");
// don't allow anything after the QID to prevent edit links
const wikidataLinkRegex = new RegExp("^https?:\/\/([a-z]+)\.(?:m\.)?wikidata\.org\/wiki\/(Q\\d+)$", "i");
const wikiExpandedRegex = new RegExp("^https?:\/\/[a-z]+\.(?:m\.)?(wikipedia|wikidata)\.org.+", "i");
let booted = false;

function exposeVariables() {
    if (!booted) {
        if (document.readyState == "complete") {
            // extract 'wgNamespaceNumber'
            const j = document.createElement('script');
            const f = document.getElementsByTagName('script')[0];
            if(f && f.parentNode) {
                j.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-ns\", mw.config.get('wgNamespaceNumber' ));";
                f.parentNode.insertBefore(j, f);
                f.parentNode.removeChild(j);
            }
            // extract 'wgUserLanguage'
            const j2 = document.createElement('script');
            const f2 = document.getElementsByTagName('script')[0];
            if(f2 && f2.parentNode) {
                j2.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-lang\", mw.config.get('wgUserLanguage'));";
                f2.parentNode.insertBefore(j2, f2);
                f2.parentNode.removeChild(j2);
            }
            // extract page id
            const j3 = document.createElement('script');
            const f3 = document.getElementsByTagName('script')[0];
            if(f3 && f3.parentNode) {
                j3.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-page-id\", mw.config.get('wgArticleId'));";
                f3.parentNode.insertBefore(j3, f3);
                f3.parentNode.removeChild(j3);
            }

            // extract page name
            const j4 = document.createElement('script');
            const f4 = document.getElementsByTagName('script')[0];
            if(f4 && f4.parentNode) {
                j4.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-page-name\", mw.config.get('wgPageName'));";
                f4.parentNode.insertBefore(j4, f4);
                f4.parentNode.removeChild(j4);
            }


            // extract wgIsArticle
            const j5 = document.createElement('script');
            const f5 = document.getElementsByTagName('script')[0];
            if(f5 && f5.parentNode) {
                j5.textContent = "document.getElementsByTagName(\"body\")[0].setAttribute(\"mw-is-page\", mw.config.get('wgIsArticle'));";
                f5.parentNode.insertBefore(j5, f5);
                f5.parentNode.removeChild(j5);
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
    const wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";
    const wikiUserLang = document.getElementsByTagName("body")[0].getAttribute("mw-lang") || "";
    const pageId = parseInt(document.getElementsByTagName("body")[0].getAttribute("mw-page-id") || "") ;
    const isPage = document.getElementsByTagName("body")[0].getAttribute("mw-is-page") === "true";
    const pageName = (document.getElementsByTagName("body")[0].getAttribute("mw-page-name") || "").replaceAll("_", " ",);

    const wikiLang = getWikiLanguage(document.baseURI);
    const wikiPage = parseWikiUrl(document.baseURI);
    if (isPage && wikiNamespace == "0" && pageName !== "Main Page") {
        let footer = document.querySelectorAll("#footer")[0] || document.getElementsByTagName("body")[0];
        let holder = document.createElement("div");
        footer.appendChild(holder);
        function setRef(ref: WwwyzzerddHolder) {

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
                }
            });

            ref.boot();
        }
        const elm = <div><WwwyzzerddHolder pageName={pageName} wikiLanguage={wikiLang} userLanguage={wikiUserLang} pageId={pageId} curUrl={getSourceUrl()} wikiLinks={[]} ref={setRef} /></div>;
        ReactDom.render(elm, holder);
    } else {
        console.log("Not running wwwyzzerdd.");
    }
}

htmlElement.addEventListener(bootEvent.type, boot);

document.onreadystatechange = exposeVariables;
if (document.readyState == "complete") {
    exposeVariables();
}
