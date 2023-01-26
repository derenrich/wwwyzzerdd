import { PropertyDB, PropertyMatch } from './propertyData';
import { ItemDB, LinkedItemData } from './itemData'
import {addItemClaim, addCoordClaim, addIdClaim, addReference} from "./write";
import {suggestIdentifiers} from "./psychiq"

export enum MessageType {
    GET_QIDS,
    GET_CLAIMS,
    GET_CLAIM_SUGGESTIONS,
    GET_PROP_NAMES,
    GET_PROP_ICONS,
    GET_PROP_SUGGESTIONS,
    SET_PROP_QID,
    GET_LINK_ID,
    SET_PROP_ID,
    SET_PROP_COORD,
    LOOKUP_QIDS
}

export interface Message {
    type: MessageType;
    payload: any;
}

interface GetQidsAsk {
    titles: string[];
    wikiLanguage?: string;
}

export interface GetQidsReply {
    data: {[key: string]: LinkedItemData};
}

interface LookupQidsAsk {
    qids: string[];
}

interface GetClaimsAsk {
    qid: string
}

export interface GetClaimsReply {
    claims: {[key: string]: any};
}

interface GetPropNamesAsk {
    language?: string;
}

interface GetPropIconsAsk {

}

export interface GetPropNamesReply {
    propNames: {[key: string]: string};
}

interface GetPropSuggestionsAsk {
    itemQid: string;
    typed: string;
    targetQid?: string;
}

interface AddPropertyReq {
    sourceItemQid: string;
    propId: string;
    targetItemQid: string;
    sourceUrl: string;
    wikiLanguage?: string;
    commentAddendum?: string;
}

interface GetLinkIdentifierAsk {
    url: string;
}

export interface GetLinkIdentifierReply {
    match: (PropertyMatch | undefined);
}

interface AddPropertyIdReq {
    sourceItemQid: string;
    propId: string;
    targetId: string;
    sourceUrl: string;
    wikiLanguage?: string;
}

interface AddPropertyCoordReq {
    sourceItemQid: string;
    propId: string;
    lat: number;
    lon: number;
    sourceUrl: string;
    wikiLanguage?: string;
}


interface GetStatementSuggestionReq {
    pageId: number;
    wikiLanguage: string;
}

interface PortHandler {
    messageType: MessageType;
    handler: (_:any) => void;
}



const MIN_WRITE_WAIT = 300;
let lastWrite = Date.now();

export class FrontendMessageBroker {
    port: chrome.runtime.Port;
    connected: boolean;
    handlers: PortHandler[];

    constructor() {
        this.port = this.openPortToBackground();
        this.connected = true;
        this.handlers = [];
        this.port.onDisconnect.addListener((d) => {
            this.connected = false;
        });
    }

    openPortToBackground(): chrome.runtime.Port {
        let port = chrome.runtime.connect({name: "www"});
        this.connected = true;
        port.onDisconnect.addListener((port) => {
            // if we disconnected then reconnect
            this.openPortToBackground();
            // after reconnecting we need to re-enable the listeners
            for (let handler of this.handlers) {
                this.port.onMessage.addListener((msg: Message) => {
                    if (msg.type === handler.messageType) {
                        handler.handler(msg.payload);
                    }
                });
            }
        });
        this.port = port;
        return port;
    }

    postMessage(msg: any) {
        if (this.connected) {
            this.port.postMessage(msg);
        } else {
            console.log("connection lost, trying again");
            this.openPortToBackground().postMessage(msg);
        }
    }

    sendMessage(msg: Message) {
        this.postMessage(msg);
    }

    sendFrontendRequest(msg: Message, response?: (r: any) => void) {
        response = response ?? function (r:any) {};
        chrome.runtime.sendMessage(msg, response);
    }

    registerFrontendHandler(type: MessageType, handler: ((_:any) => void)) {
        this.port.onMessage.addListener((msg: Message) => {
            if (msg.type === type) {
                handler(msg.payload);
            }
        });

        let handlerTuple: PortHandler = {
            messageType: type,
            handler
        };
        this.handlers = this.handlers.concat(handlerTuple);
    }
}


export class BackendMessageBroker {
    port: chrome.runtime.Port;
    connected: boolean;
    itemDB: ItemDB;
    propDB: PropertyDB;

    constructor(port: chrome.runtime.Port, itemDB: ItemDB, propDB: PropertyDB) {
        this.port = port;
        this.itemDB = itemDB;
        this.propDB = propDB;

        this.connected = true;
        this.port.onDisconnect.addListener((d) => {
            this.connected = false;
        });
        chrome.runtime.onMessage.addListener(this.handleOneTimeRequest.bind(this));
    }

    handleOneTimeRequest(msg: any, b: chrome.runtime.MessageSender, reply: (response?: any) => void): boolean {
        this.handleMessageBackend(msg, reply);
        return true;
    }

    handleMessageBackend(msg: Message, reply?: ((response?: any) => void)){
        switch(msg.type) {
            case MessageType.GET_QIDS: {
                const payload = msg.payload as GetQidsAsk;
                this.itemDB.lookupTitles(payload.titles, payload.wikiLanguage).then((data) => {
                    this.postMessage({
                        type: MessageType.GET_QIDS,
                        payload: {
                            data
                        }
                    });
                });
                break;
            }

            case MessageType.GET_CLAIMS: {
                const payload = msg.payload as GetClaimsAsk;
                this.itemDB.lookupQidContent([payload.qid], true).then((claims) => {
                    let response = {
                        type: MessageType.GET_CLAIMS,
                        payload: {
                            claims
                        }
                    };
                    if (reply) reply( response );
                    this.postMessage(response);
                });
                break;
            }

            case MessageType.GET_PROP_NAMES: {
                const payload = msg.payload as GetPropNamesAsk;
                const language: string = payload.language || "en";
                this.propDB.getProperties(language).then((props) => {
                    let propNames: {[key: string]: string} = {};
                    props.forEach((prop) => {
                        propNames[prop.prop] = prop.name;
                    });
                    let response = {
                        type: MessageType.GET_PROP_NAMES,
                        payload: {
                            propNames
                        }
                    };
                    if (reply) reply( response );
                    this.postMessage(response);
                });

                break;
            }

            case MessageType.GET_PROP_ICONS: {
                const payload = msg.payload as GetPropIconsAsk;
                this.propDB.getProperties().then((props) => {
                    let propIcons: {[key: string]: string} = {};
                    props.forEach((prop) => {
                        if (prop.icon) {
                            propIcons[prop.prop] = prop.icon;
                        }
                    });
                    let response = {
                        type: MessageType.GET_PROP_ICONS,
                        payload: {
                            propIcons
                        }
                    };
                    if (reply) reply( response );
                    this.postMessage(response);
                });
                break;
            }

            case MessageType.GET_PROP_SUGGESTIONS: {
                const payload = msg.payload as GetPropSuggestionsAsk;
                this.propDB.suggestProperty(payload.itemQid, payload.typed, payload.targetQid).then((resp) => {
                    let response = {
                        type: MessageType.GET_PROP_SUGGESTIONS,
                        payload: resp
                    };
                    if (reply) reply( response );
                    this.postMessage(response);
                });
                break;
            }

            case MessageType.SET_PROP_QID: {
                // crappy debounce method
                //let now = Date.now();
                //if (now - lastWrite < MIN_WRITE_WAIT) break;
                //lastWrite = Date.now();
                const payload = msg.payload as AddPropertyReq;
                let addResponse = addItemClaim(payload.sourceItemQid, payload.propId, payload.targetItemQid, payload.commentAddendum);
                addResponse.then((resp) => {
                    if (resp && resp.success) {
                        let claimId = resp.claim.id;                        
                        addReference(payload.sourceUrl, claimId, payload.wikiLanguage, payload.commentAddendum);
                    }
                    if (reply) reply({});
                    this.handleMessageBackend({
                        type: MessageType.GET_CLAIMS,
                        payload: {
                            qid: payload.sourceItemQid
                        }
                    });
                });
                break;
            }

            case MessageType.GET_LINK_ID: {
                const payload = msg.payload as GetLinkIdentifierAsk;
                const result = this.propDB.parseUrl(payload.url);
                result.then((resp) => {
                    const message = {
                        type: MessageType.GET_LINK_ID,
                        payload: {match: resp}
                    };
                    if (reply) reply(message);
                    this.postMessage(message);
                });
                break;
            }
            case MessageType.SET_PROP_ID: {
                // crappy debounce method
                let now = Date.now();
                if (now - lastWrite < MIN_WRITE_WAIT) break;
                lastWrite = Date.now();
                const payload = msg.payload as AddPropertyIdReq;
                let addResponse = addIdClaim(payload.sourceItemQid, payload.propId, payload.targetId);
                addResponse.then((resp) => {
                    if (resp && resp.success) {
                        let claimId = resp.claim.id;                        
                        addReference(payload.sourceUrl, claimId, payload.wikiLanguage);
                    }
                    if (reply) reply({});
                    this.handleMessageBackend({
                        type: MessageType.GET_CLAIMS,
                        payload: {
                            qid: payload.sourceItemQid
                        }
                    });
                });
                break;
            }
            case MessageType.SET_PROP_COORD: {
                // crappy debounce method
                let now = Date.now();
                if (now - lastWrite < MIN_WRITE_WAIT) break;
                lastWrite = Date.now();
                const payload = msg.payload as AddPropertyCoordReq;
                let addResponse = addCoordClaim(payload.sourceItemQid, payload.propId, payload.lat, payload.lon);
                addResponse.then((resp) => {
                    if (resp && resp.success) {
                        let claimId = resp.claim.id;                        
                        addReference(payload.sourceUrl, claimId, payload.wikiLanguage);
                    }
                    if (reply) reply({});
                    this.handleMessageBackend({
                        type: MessageType.GET_CLAIMS,
                        payload: {
                            qid: payload.sourceItemQid
                        }
                    });
                });
                break;
            }
            case MessageType.LOOKUP_QIDS: {
                const payload = msg.payload as LookupQidsAsk;
                this.itemDB.lookupQids(payload.qids).then((data) => {
                    this.postMessage({
                        type: MessageType.GET_QIDS,
                        payload: {
                            data
                        }
                    });
                });
                break;
            }

            case MessageType.GET_CLAIM_SUGGESTIONS: {
                const payload = msg.payload as GetStatementSuggestionReq;
                let suggestions = suggestIdentifiers(payload.pageId, payload.wikiLanguage);
                suggestions.then((sugg) => {
                    let response = {
                        type: MessageType.GET_CLAIM_SUGGESTIONS,
                        payload: {
                            suggestions: sugg
                        }
                    };
                    if (reply) reply( response );
                    this.postMessage(response);
                });
            }
        }
    }
    postMessage(msg: any) {
        if (this.connected) {
            this.port.postMessage(msg);
        }
    }

    _handlePortMesage(msg:Message) {
        this.handleMessageBackend(msg);
    }

}

var itemDB: ItemDB | null = null;
var propDB:  PropertyDB | null = null;

function initializeResources() {
    if (!itemDB) {
        itemDB = new ItemDB();
    }
    if (!propDB) {
        propDB = new PropertyDB();
    }
}

export function registerBackendBroker() {
    chrome.runtime.onConnect.addListener(function(port) {
        initializeResources();
        if (itemDB && propDB) {
            const mb = new BackendMessageBroker(port, itemDB, propDB);
            port.onMessage.addListener(mb._handlePortMesage.bind(mb));
        }
    });
}

export function registerFrontendBroker(): FrontendMessageBroker {
    return new FrontendMessageBroker();
}
