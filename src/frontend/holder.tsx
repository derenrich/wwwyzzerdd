import React, { Component, ReactPortal } from 'react';
import Portal from '@material-ui/core/Portal';
import Snackbar from '@material-ui/core/Snackbar';
import {FrontendMessageBroker, registerFrontendBroker, MessageType, ReportError} from "../messageBroker";
import {StatementSuggestions} from "../psychiq";
import {CONFIG_KEY, ConfigObject, getConfig} from "../config"
import { Typography } from '@material-ui/core';
import {QidData, PropTuple, SpanField, renderSpanField} from "./common";
import {SuggestedClaimsWindow} from "./suggested_claims";
import {Orb, OrbMode} from "./orb";
import {ItemWindow, LinkWindow, CoordLinkWindow, SpanWindow} from "./windows";
import { insertSpan } from './insertSpan';
import { SelectionData } from '~context';

const wikiLinkRegex = new RegExp("^https?:\/\/[a-z]+\.(?:m\.)?wikipedia\.org\/wiki\/([^#]+)", "i");
const wikidataLinkRegex = new RegExp("^https?:\/\/(?:m\.|www\.)?wikidata\.org\/wiki\/(Q\\d+)", "i");

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

function parseWikidataUrl(url: string): string | undefined {
    let m = wikidataLinkRegex.exec(url);
    if(m && m.length > 1) {
        return decodeURIComponent(m[1]);
    } else {
        return undefined;
    }
}

interface LinkedElement {
    element: HTMLElement;
    link: string;
    slug?: string;
}

interface TextSpan {
    element: HTMLElement;
    text: string;
}

interface ExternalLinkedElement {
    element: HTMLElement;
    pid: string;
    identifier: string;
    caseInsensitive: boolean;
}

interface CoordLinkedElement {
    element: HTMLElement;
    lat: number;
    lon: number;
}

interface HolderProps {
    pageId: number;
    wikiLinks: HTMLElement[];
    curUrl: string;
    userLanguage?: string;
    wikiLanguage?: string;
    pageName: string;
}

interface HolderState {
    errorMessage?: string;
    textSpans: TextSpan[];
    wikiLinks: LinkedElement[];
    wikidataLinks: LinkedElement[];
    externalLinks: ExternalLinkedElement[];
    coordLinks: CoordLinkedElement[];
    titleBox?: HTMLElement;
    booted: boolean;
    claims: {[key: string]: any};
    propNames: {[key: string]: string};
    propIcons: {[key: string]: string};
    qidMapping: {[key: string]: QidData};
    curPageQid?: string;
    config?: ConfigObject;
    suggestedClaims: StatementSuggestions[];
}

export class WwwyzzerddHolder extends Component<HolderProps, HolderState> {
    broker: FrontendMessageBroker;

    constructor(props: HolderProps) {
        super(props);
        this.state = {
            textSpans: [],
            wikiLinks: [],
            wikidataLinks: [],
            coordLinks: [],
            externalLinks: [],
            booted: false,
            claims: {},
            propNames: {},
            propIcons: {},
            qidMapping: {},
            suggestedClaims: [],
            titleBox: undefined
        };
        this.broker = registerFrontendBroker();
        this.broker.registerFrontendHandler(MessageType.GET_QIDS, this.handleQids.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_CLAIMS, this.handleClaims.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_PROP_NAMES, this.handleProps.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_PROP_ICONS, this.handlePropIcons.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_CLAIM_SUGGESTIONS, this.handleClaimSuggestions.bind(this));
        this.broker.registerFrontendHandler(MessageType.REPORT_ERROR, this.handleError.bind(this));

        this.broker.registerFrontendMessageHandler(MessageType.SET_PARSE_DATA, this.handleContextParse.bind(this));

        this.broker.sendMessage({type: MessageType.GET_PROP_NAMES, payload: {}});
        this.broker.sendMessage({type: MessageType.GET_PROP_ICONS, payload: {}});

        getConfig().then((conf) => {
            this.setState({
                config: conf
            });
        });

        // handle config changes
        chrome.storage.onChanged.addListener( (changes, namespace) => {
            for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
                if (namespace == "sync" && key == CONFIG_KEY) {
                    this.setState({
                        config: newValue
                    });
                }
            }
          });

        this.broker.sendMessage({
            type: MessageType.GET_QIDS,
            payload: {
                titles: [this.props.pageName],
                wikiLanguage: this.props.wikiLanguage
            }
        });
    }

    componentDidUpdate(_1: any, prevState: HolderState, _2: any) {
        // if we just enabled psychiq then start the boot process
        if (!!this.state.config) {
            if (!prevState.config) {
                this.bootPsychiq();
            } else if (prevState.config.usePsychiq === false && this.state.config.usePsychiq === true){
                this.bootPsychiq();
            }
        }
    }

    handleContextParse(msg: any) {
        let selectionData: SelectionData = msg;
        let elm = insertSpan(selectionData);
        if (elm) {
            this.addTextSpan(elm, selectionData.text);
        }
    }

    handleProps(payload: any) {
        this.setState({
            propNames: payload.propNames
        });
    }

    handlePropIcons(payload: any) {
        this.setState({
            propIcons: payload.propIcons
        });
    }

    handleError(payload: any) {
        this.setState({errorMessage: (payload as ReportError).errorMessage});
    }

    hideError() {
        this.setState({errorMessage: undefined});
    }

    handleClaimSuggestions(payload: any) {
        let suggestedClaims: StatementSuggestions[] = payload.suggestions;
        this.setState({
            suggestedClaims: suggestedClaims
        });

        this.broker.sendMessage({
            type: MessageType.LOOKUP_QIDS,
            payload: {
                qids: suggestedClaims.filter((s) => s.pid != "unknown").map((s) => s.qid)
            }
        });
    }

    handleQids(payload: any) {
        let curTitle = this.props.pageName;
        if (!!curTitle && curTitle in payload.data) {
            let curPageQid = payload.data[curTitle].qid;
            this.setState({
                curPageQid: curPageQid
            });
            this.broker.sendMessage({
                type: MessageType.GET_CLAIMS,
                payload: {
                    qid: curPageQid
                }
            });
        }
        this.setState(function(prevState){
            let newQidMapping = Object.assign({}, prevState.qidMapping, payload.data);
            return {qidMapping: newQidMapping};
        });
    }

    handleClaims(payload: any) {
        this.setState({
            claims: payload.claims
        });
    }

    addTextSpan(elm: HTMLElement, text: string) {
        this.setState(function(state:HolderState) {
            return {
                textSpans: state.textSpans.concat({
                    element: elm,
                    text: text.trim()
                })
            };
        });
    }

    addWikiLink(url: string, elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                wikiLinks: state.wikiLinks.concat({
                  element: elm,
                  link: url,
                  slug: parseWikiUrl(url)
                })
            };
        });
    }

    addTitleBox(elm?: HTMLElement) {
        this.setState({
            titleBox: elm
        });
    }

    addWikidataLink(url: string, elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                wikidataLinks: state.wikidataLinks.concat({
                  element: elm,
                  link: url,
                  slug: parseWikidataUrl(url)
                })
            };
        });
    }

    addExternalLink(property: string, identifier: string, elm: HTMLAnchorElement, caseInsensitive: boolean) {
        this.setState(function(state: HolderState) {
            return {
                externalLinks: state.externalLinks.concat({
                   element: elm,
                   pid: property,
                   identifier: identifier,
                   caseInsensitive
                })
            };
        });
    }

    addCoordLink(lat: number, lon: number, elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                coordLinks: state.coordLinks.concat({
                   element: elm,
                   lat: lat,
                   lon: lon
                })
            };
        });
    }


    boot() {
        this.setState((prevState) => {
            // send the message in set state to ensure we have the most recent state
            this.broker.sendMessage({
                type: MessageType.GET_QIDS,
                payload: {
                    titles: prevState.wikiLinks.map((l) => parseWikiUrl(l.link)).filter((l) => !!l),
                    wikiLanguage: this.props.wikiLanguage
                }
            });
            this.broker.sendMessage({
                type: MessageType.LOOKUP_QIDS,
                payload: {
                    qids: prevState.wikidataLinks.map((l) => l.slug).filter((l) => !!l)
                }
            });
            return {
                booted: true
            };
        });
    }

    bootPsychiq() {
        // if we should be using psychiq then send the request to HF
        if (this.usePsychiq()) {
            this.broker.sendMessage({
                type: MessageType.GET_CLAIM_SUGGESTIONS,
                payload: {
                    pageId: this.props.pageId,
                    wikiLanguage: this.props.wikiLanguage
                }
            });
        }
    }

    getSpanFields(span?: string): (string | SpanField)[] {
        let matchedFields = [];
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].aliases;
            for (let alias of (claims["en"] || [])) {
                if (alias.value == span) {
                    matchedFields.push({
                        lang: "en",
                        field: "alias"
                    });
                }
            }

            let descriptions = d[k].descriptions;
            for (let lang of Object.keys((descriptions || {}))) {
                if (descriptions[lang].value == span) {
                    matchedFields.push({
                        lang: lang,
                        field: "description",
                    });
                }
            }

            let labels = d[k].labels;
            for (let lang of Object.keys((labels || {}))) {
                if (labels[lang].value == span) {
                    matchedFields.push({
                        lang: lang,
                        field: "label"
                    });
                }
            }
        }
        return matchedFields;
    }

    lookupSlug(slug?: string): QidData | undefined {
        if (!slug) {
            return undefined;
        }
        if (slug in this.state.qidMapping) {
            return this.state.qidMapping[slug];
        } else {
            return undefined;
        }
    }

    lookupWikidataQid(qid?: string): QidData | undefined {
        if (!qid) {
            return undefined;
        }
        // yes this is O(n) ...
        for (let data of Object.values(this.state.qidMapping)) {
            if (data.qid == qid) {
                return data;
            }
        }
        return undefined;
    }


    getProps(qid:string): string[] {
        let matchedProps = [];
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let prop of Object.keys(claims)) {
                for (let statementV of Object.values(claims[prop])) {
                    let statement = (statementV as any);
                    if (statement.rank != "deprecated" && statement.mainsnak.datatype == "wikibase-item") {
                        if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value.id == qid) {
                            matchedProps.push(prop);
                        }
                    }
                }
            }
        }
        return matchedProps;
    }

    checkClaimExists(pid:string, qid:string): boolean {
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            if (claims[pid]) {
                let statements = claims[pid];
                for (let statementV of Object.values(statements)) {
                    let statement = (statementV as any);
                    if (statement.rank != "deprecated" && statement.mainsnak.datatype == "wikibase-item") {
                        if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value.id == qid) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }


    identifierChecker(pid:string, identifier: string, caseInsensitive: boolean): boolean {
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let statementV of Object.values(claims[pid] || {})) {
                let statement = (statementV as any);
                if (statement.rank != "deprecated" && (statement.mainsnak.datatype == "external-id" || statement.mainsnak.datatype == "url" || statement.mainsnak.datatype == "string")) {
                    if (caseInsensitive) {
                        if (statement.mainsnak.datavalue && (statement.mainsnak.datavalue.value as string).toLowerCase() == identifier.toLowerCase()) {
                            return true;
                        }
                    } else {
                        if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value == identifier) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    coordChecker(lat: number, lon: number): boolean {
        let pid = 'P625';
        let EPSILON = 0.00001;
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let statementV of Object.values(claims[pid] || {})) {
                let statement = (statementV as any);
                if (statement.rank != "deprecated" && statement.mainsnak.datatype == "globe-coordinate") {
                    if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value) {
                        let targetLat = statement.mainsnak.datavalue.value.latitude;
                        let targetLon = statement.mainsnak.datavalue.value.longitude;
                        let targetPrecision = statement.mainsnak.datavalue.value.precision ?? EPSILON;
                        return (Math.abs(targetLat - lat) < targetPrecision && Math.abs(targetLon - lon) < targetPrecision);
                    }
                }
            }
        }
        return false;
    }

    mapProps(props:string[]): PropTuple[] {
        return props.map((p) => {
           return {
                propId: p,
                propName: this.state.propNames[p] ?? undefined
            }
        });
    }

    orbsHidden(): boolean {
        // both config is set and orbs is set is not true
        return !(!!this.state.config && !!this.state.config.showOrbs);
    }

    usePsychiq(): boolean {

        if (this.props.wikiLanguage !== "en") {
            return false;
        }

        if (this.props.pageId === 0) {
            return false;
        }

        if (!this.state.config) {
            // if there is no config at all
            return true;
        }
        if (this.state.config.usePsychiq === true) {
            // if there is a config and it's true
            return true;
        }
        if (this.state.config.usePsychiq === undefined) {
            // if there is a config and it's undefined
            return true;
        }

        return false;
    }

    renderTitleBoxPortal() : React.ReactNode {
        let topSuggestions = this.state.suggestedClaims.filter(sug => sug.pid != "unknown").slice(0, 5);
        let linkedSuggestion = topSuggestions.filter(sug => this.checkClaimExists(sug.pid, sug.qid)).length > 0;
        let anySuggestions = topSuggestions.length > 0;
        return <Portal container={this.state.titleBox!}>
            <Orb
            location="title"
            mode={linkedSuggestion ? OrbMode.Linked : (anySuggestions ? OrbMode.Unlinked : OrbMode.Loading)}
            hover={anySuggestions ? <Typography>suggested claims</Typography>: <Typography>&lt;loading suggestions&gt;</Typography>}
            popover={anySuggestions ? <SuggestedClaimsWindow
                claimExists={this.checkClaimExists.bind(this)}
                broker={this.broker}
                claims={this.state.claims}
                pageQid={this.state.curPageQid!}
                suggestedClaims={topSuggestions}
                propNames={this.state.propNames}
                qidMapping={this.state.qidMapping}
                wikiLanguage={this.props.wikiLanguage}
                 /> : undefined}
            hidden={this.orbsHidden()}
            />
        </Portal>;
    }

    renderSpanPortal(span: TextSpan): React.ReactNode {
        let matchedFields = this.getSpanFields(span.text);

        let mode = (!this.state.booted || !this.state.curPageQid) ? OrbMode.Unknown : (
                matchedFields.length > 0 ? OrbMode.Linked : OrbMode.Unlinked);

        let hoverText = matchedFields.length > 0 ?  <Typography>
                {Array.from(new Set(matchedFields.map((f) => renderSpanField(f)))).join(" & ")}
            </Typography> : null;

        return <Portal container={span.element}>
            <Orb
                mode = {mode}
                hidden={this.orbsHidden()}
                hover={hoverText}
                popover={
                    <SpanWindow 
                        wikiLanguage={this.props.wikiLanguage ?? "en"}
                        pageQid={this.state.curPageQid ?? ""}
                        broker={this.broker}
                        spanText={span.text}
                    />
                }
                />
        </Portal>;
    }

    renderLinkPortal(qidData: QidData | undefined, link: LinkedElement): React.ReactNode {
        let matchedProps: string[] = !qidData ? [] : this.getProps(qidData.qid);
        let propTuples = this.mapProps(matchedProps);
        let mode = (!this.state.booted || !this.state.curPageQid) ? OrbMode.Unknown : (
            (!qidData) ? OrbMode.Unknown : (
                matchedProps.length > 0 ?
                OrbMode.Linked
                 : OrbMode.Unlinked
            )
        );

        let hoverText = matchedProps.length > 0 ?  <Typography>
            {Array.from(new Set(matchedProps
                .map((p) => this.state.propNames[p] || "")
                .filter((p) => p.length > 0))).join(" & ")}
        </Typography> : null;

        return <Portal container={link.element}>
            {!!qidData ?
            <Orb
                mode={mode}
                hidden={this.orbsHidden()}
                hover={hoverText}
                popover={<ItemWindow broker={this.broker}
                    wikiLanguage={this.props.wikiLanguage}
                    pageQid={this.state.curPageQid}
                    qid={qidData.qid} label={qidData.label}
                    description={qidData.description} existingProps={propTuples} />}
             /> : null
            }
        </Portal>;

    }

    render() {
        return <React.Fragment>
            {this.state.externalLinks.map((link) => {
                let linked = this.identifierChecker(link.pid, link.identifier, link.caseInsensitive);
                let orbMode =  (!this.state.booted || !this.state.curPageQid) ? OrbMode.Unknown : (linked ? OrbMode.Linked : OrbMode.Unlinked);
                return <Portal container={link.element}>
                    { this.state.propIcons[link.pid] ?
                        <img
                            style={{"height": "1.2em", "display": this.orbsHidden() ? "none" : "inline"}}
                            src={this.state.propIcons[link.pid]}
                            ref={ (node) => {
                                if (node) {
                                    // hack for mobile mode which has an !important style
                                    node.style.setProperty("height", "1.2em", "important");
                                }
                            }}
                            />
                        : null
                    }
                    <Orb
                        hidden={this.orbsHidden()}
                        mode={orbMode}
                        hover={this.state.propNames[link.pid] ? <Typography>{this.state.propNames[link.pid]}</Typography>:  undefined}
                        popover={
                            <LinkWindow pageQid={this.state.curPageQid}
                            pid={link.pid} linked={linked} identifier={link.identifier}
                            broker={this.broker} propNames={this.state.propNames} />
                        }
                     />
                </Portal>;
            })}

            {this.state.coordLinks.map((link) => {
                let pid = 'P625';
                let linked = this.coordChecker(link.lat, link.lon);
                let orbMode =  (!this.state.booted || !this.state.curPageQid) ? OrbMode.Unknown : (linked ? OrbMode.Linked : OrbMode.Unlinked);
                return <Portal container={link.element}>
                    { this.state.propIcons[pid] ?
                        <img style={{"height": "1.2em"}} src={this.state.propIcons[pid]} />
                        : null
                    }
                    <Orb
                        hidden={this.orbsHidden()}
                        mode={orbMode}
                        hover={this.state.propNames[pid] ? <Typography>{this.state.propNames[pid]}</Typography>:  undefined}
                        popover={
                            <CoordLinkWindow pageQid={this.state.curPageQid}
                            pid={pid} linked={linked} lat={link.lat} lon={link.lon}
                            broker={this.broker} propNames={this.state.propNames} />
                        }
                     />
                </Portal>;
            })}


            {this.state.wikiLinks.map((link) => {
                let qidData = this.lookupSlug(link.slug);
                return this.renderLinkPortal(qidData, link);
            })}

            {this.state.wikidataLinks.map((link) => {
                let qidData = this.lookupWikidataQid(link.slug);
                return this.renderLinkPortal(qidData, link);
            })}

            {this.state.textSpans.map((span) => {
                return this.renderSpanPortal(span);  
            })}

            {this.state.titleBox && this.usePsychiq() ? this.renderTitleBoxPortal() : null}
            <Snackbar
                open={!!this.state.errorMessage}
                autoHideDuration={6000}
                onClose={this.hideError.bind(this)}
                message={this.state.errorMessage ? `Wwwyzzerdd Error: ${this.state.errorMessage}` : ""}
                anchorOrigin={{vertical: "bottom", horizontal: "left"}}
            />
        </React.Fragment>;
    }
}

