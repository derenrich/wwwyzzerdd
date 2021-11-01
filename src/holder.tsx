import React, { Component } from 'react';
import Portal from '@material-ui/core/Portal';

import {MessageBroker, registerFrontendBroker, MessageType, Message, GetQidsReply, GetClaimsReply, GetPropNamesReply, GetLinkIdentifierReply} from "./messageBroker";
import {PropertySuggestions} from "./propertyData";
import {LinkedItemData} from "./itemData";
import {CONFIG_KEY, ConfigObject, getConfig} from "./config"
import { withStyles, createStyles, WithStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import Popover from '@material-ui/core/Popover';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import AddIcon from '@material-ui/icons/Add';
import List from '@material-ui/core/List';
import ListItem, { ListItemProps } from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LinkIcon from '@material-ui/icons/Link';
import Autocomplete from '@material-ui/lab/Autocomplete';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import { Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';



const wikiLinkRegex = new RegExp("^https?:\/\/[a-z]+\.wikipedia\.org\/wiki\/([^#]+)", "i");
const bannedPrefixes: string[] = ["File:", "Template:", "Special:", "Template talk:", "Help:", "Wikipedia:", "Talk:", "Category:"];

function getSourceUrl(): string {
    let link = document.querySelector("#t-permalink a")
    if (link) {
        return (link as HTMLAnchorElement).href;
    } else {
        return document.baseURI;
    }
}


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


const styles = createStyles({
    orb: {
        //color: "#198754",
        //color: "#6c757d",
        fontSize: "smaller",
        fontStyle: "normal",
        fontWeight: "normal",
        "&:hover": {
            "filter": "contrast(500%) blur(1px) saturate(150%)",
        },
        "&::after": {
            "content": "\"\\2b24\""
        },
        "text-decoration": "none",
        "outline": "0",
        "cursor": "pointer"        
    },
    hoverText: {
        fontSize: "large"
    },
    connectedOrb: {
        color: "#2bdb56",
    },
    disconnectedOrb: {
        color: "#6c757d"
    },
    hiddenOrb: {
        display: "none"
    },
    card: {
        maxWidth: 500,
        minWidth: 350
    }
});

enum OrbMode {
    Unknown,
    Unlinked,
    Linked
}

interface CloseParam {
    close?: () => void;
}

interface OrbProps extends WithStyles<typeof styles> {
    mode: OrbMode;
    hover?: React.ReactNode;
    popover?: React.ReactElement<CloseParam>;
    hidden?: boolean;
}

interface OrbState {
    targetElement?: HTMLElement;
}

let Orb = withStyles(styles)(class extends Component<OrbProps, OrbState> {
    constructor(props: OrbProps) {
        super(props);
        this.state = {};
    }

    handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        this.setState({targetElement: event.currentTarget});
        event.stopPropagation();
    };

    handlePopoverClose = () => {
        this.setState({targetElement: undefined});
    };

    render() {
        let orbClass = (this.props.mode == OrbMode.Unknown || this.props.hidden) ?  this.props.classes.hiddenOrb : 
            (this.props.mode == OrbMode.Unlinked) ? this.props.classes.disconnectedOrb : this.props.classes.connectedOrb;
        return <React.Fragment>
        <Tooltip title={this.props.hover ?? ""}>
         <span 
            onClick={this.handlePopoverOpen} 
            className={[orbClass, this.props.classes.orb].join(" ")}>
        </span>
        </Tooltip>
        <Popover open={!!this.state.targetElement && !!this.props.popover} anchorEl={this.state.targetElement} onClose={this.handlePopoverClose.bind(this)}>
            {!! this.props.popover ? React.cloneElement(this.props.popover, {close: this.handlePopoverClose.bind(this)}) : undefined}
        </Popover>
        </React.Fragment>;        
    }
});

interface LinkedElement {
    element: HTMLElement;
    link: string;
    slug?: string;
}

interface ExternalLinkedElement {
    element: HTMLElement;
    pid: string;
    identifier: string;
}

interface CoordLinkedElement {
    element: HTMLElement;
    lat: number;
    lon: number;
}

interface QidData {
    qid: string;
    label?: string;
    description?: string;
}

interface HolderProps {
    pageTitle: string;
    wikiLinks: HTMLElement[];
    curUrl: string;
    userLanguage?: string;
    wikiLanguage?: string;
}

interface HolderState {
    wikiLinks: LinkedElement[];
    externalLinks: ExternalLinkedElement[];
    coordLinks: CoordLinkedElement[];
    booted: boolean;
    claims: {[key: string]: any};
    propNames: {[key: string]: string};
    propIcons: {[key: string]: string};
    qidMapping: {[key: string]: QidData};
    curPageQid?: string;
    config?: ConfigObject;
}

export class WwwyzzerddHolder extends Component<HolderProps, HolderState> {
    broker: MessageBroker;

    constructor(props: HolderProps) {
        super(props);
        this.state = {
            wikiLinks: [],
            coordLinks: [],
            externalLinks: [],
            booted: false,
            claims: {},
            propNames: {},
            propIcons: {},
            qidMapping: {}
        };
        this.broker = registerFrontendBroker();
        this.broker.registerFrontendHandler(MessageType.GET_QIDS, this.handleQids.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_CLAIMS, this.handleClaims.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_PROP_NAMES, this.handleProps.bind(this));
        this.broker.registerFrontendHandler(MessageType.GET_PROP_ICONS, this.handlePropIcons.bind(this));

        this.broker.sendMessage({type: MessageType.GET_PROP_NAMES, payload: {}});
        this.broker.sendMessage({type: MessageType.GET_PROP_ICONS, payload: {}});


        getConfig().then((conf) => {
            this.setState({
                config: conf
            });
        });
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
                titles: [parseWikiUrl(document.baseURI)],
                wikiLanguage: this.props.wikiLanguage
            }
        });
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

    handleQids(payload: any) {
        let curTitle = parseWikiUrl(document.baseURI);
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

    addExternalLink(property: string, identifier: string, elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                externalLinks: state.externalLinks.concat({
                   element: elm,
                   pid: property,
                   identifier: identifier
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
            return {
                booted: true
            };
        });
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

    getProps(qid:string): string[] {
        let matchedProps = []
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

    identifierChecker(pid:string, identifier: string): boolean {
        let d = this.state.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let statementV of Object.values(claims[pid] || {})) {                
                let statement = (statementV as any);
                if (statement.rank != "deprecated" && statement.mainsnak.datatype == "external-id") {
                    if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value == identifier) {
                        return true;
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
        console.log("hidden?" ,this.state.config);
        return !(!!this.state.config && !!this.state.config.showOrbs);
    }

    render() {
        return <React.Fragment>
            {this.state.externalLinks.map((link) => {
                let linked = this.identifierChecker(link.pid, link.identifier);
                let orbMode =  (!this.state.booted || !this.state.curPageQid) ? OrbMode.Unknown : (linked ? OrbMode.Linked : OrbMode.Unlinked);
                return <Portal container={link.element}>
                    { this.state.propIcons[link.pid] ? 
                        <img style={{"height": "1.2em"}} src={this.state.propIcons[link.pid]} />
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
            })}
        </React.Fragment>;
    }
}

interface PropTuple {
    propId: string;
    propName?: string;
}

 interface ItemWindowProps extends CloseParam, WithStyles<typeof styles> {
     broker: MessageBroker;
     qid: string;
     pageQid?: string;
     label?: string;
     description?: string;
     existingProps: PropTuple[];
     wikiLanguage?: string;
 }

 interface ItemWindowState {
     addMode: boolean;
 }

 const ItemWindow = withStyles(styles)(
    class extends Component<ItemWindowProps, ItemWindowState> {
        constructor(props: ItemWindowProps) {
            super(props);
            this.state = {
                addMode: false,
            }
        }


        addMode = () => {
            this.setState({
                addMode: true
            });
        };   


        close = () => {
            !!this.props.close ? this.props.close() : null;
        }

        add (pid?: string): void {
            if (pid && this.props.pageQid) {
                this.props.broker.sendMessage({
                    type: MessageType.SET_PROP_QID,
                    payload: {
                        sourceItemQid: this.props.pageQid,
                        propId: pid,
                        targetItemQid: this.props.qid,
                        sourceUrl: getSourceUrl(),
                        wikiLanguage: this.props.wikiLanguage
                    }
                });
                this.close();
            }
        }

        render() {
            let propItems = this.props.existingProps.map((prop) => {
                return <ListItem>
                    <ListItemIcon>
                      <LinkIcon />
                    </ListItemIcon>
                    <ListItemText primary={prop.propName ?? ""} secondary={prop.propId} />
                </ListItem>;
            });
    
            const qidLink = <React.Fragment>
                <a href={`https://www.wikidata.org/wiki/${this.props.qid}`}>{this.props.qid}</a>
                {" "}·{" "}
                {this.props.description ?? "«no description»"}
            </React.Fragment>;

            return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={this.props.label ?? "«no label»"} subheader={qidLink}/>
            <CardContent>
            <List dense component="nav" >                                    
            {propItems}
            {this.state.addMode ? 
            <Suggester 
                targetQid={this.props.pageQid || ""}
                broker={this.props.broker}
                onSubmit={this.add.bind(this)} />  :
            <ListItem button onClick={this.addMode}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add Statement" />
            </ListItem>
            }
             </List>                
            </CardContent>
        </Card>;

        }        
    }
)


interface SuggesterProps {
    targetQid: string;
    broker: MessageBroker;
    onSubmit: (pid?: string) => void;
}

interface Suggestion {
    id: string;
    label: string;
};

interface SuggesterState {
    typed: string;
    selectedPid?: string;
    propNames: {[key: string]: string};
    suggestedProps: Suggestion[];
}

class Suggester extends Component<SuggesterProps, SuggesterState> {

    constructor(props: SuggesterProps) {
        super(props);
        this.state = {
            suggestedProps: [],
            propNames: {},
            typed: ""
        };
        this.props.broker.sendFrontendRequest({
            type: MessageType.GET_PROP_NAMES,
            payload: {}
        }, (resp) => {

            this.setState({
                propNames: resp.payload.propNames
            });
        });
        this.suggest();
    }

    submit() {
        this.props.onSubmit(this.state.selectedPid);        
    }

    suggest() {
        this.props.broker.sendFrontendRequest({
            type: MessageType.GET_PROP_SUGGESTIONS,
            payload: {
                itemQid: this.props.targetQid,
                typed: this.state.typed
            }
        }, (resp: any) => {
            this.setState({
                suggestedProps: resp.payload.suggestions
            })
        })
    }

    componentDidUpdate(prevProps: SuggesterProps, prevState: SuggesterState) {
        // todo: discard not most recent requests
        if (this.state.typed != prevState.typed) {
            this.suggest();
        }
    }

    render() {
       return <ListItem>
        <ListItemIcon>
             <IconButton onClick={this.submit.bind(this)}><AddIcon /></IconButton>
        </ListItemIcon>
        <Autocomplete
            fullWidth
            autoHighlight
            autoSelect
            openOnFocus
            onInputChange={(evt, value, reason) => {
                this.setState({
                    typed: value
                });
            }}
            onChange={(evt, obj, reason) => {
                this.setState({"selectedPid": !!obj ? obj['pid'] : undefined});
            }}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} label="Property" variant="outlined"  />}
            options={this.state.suggestedProps.map((sugg) => {return {"pid": sugg.id, "label": sugg.label};})}
            getOptionLabel={(opt) => opt.label}
            id="prop-box"  />
        </ListItem>;
    }
}



interface LinkWindowProps extends CloseParam, WithStyles<typeof styles> {
    pageQid?: string;
    broker: MessageBroker;
    pid: string;
    identifier: string;
    linked: boolean;
    propNames: {[key: string]: string};

}

const LinkWindow = withStyles(styles)(
    class extends Component<LinkWindowProps, {}> {
        constructor(props: LinkWindowProps) {
            super(props);
        }

        link (): void {
            if (!this.props.linked && !!this.props.pageQid) {
                this.props.broker.sendMessage({
                    type: MessageType.SET_PROP_ID,
                    payload: {
                        sourceItemQid: this.props.pageQid,
                        propId: this.props.pid,
                        targetId: this.props.identifier,
                        sourceUrl: getSourceUrl()
                    }
                });
                this.close();
            }
        }

        close = () => {
            !!this.props.close ? this.props.close() : null;
        }

        render() {
        const pidLink = <React.Fragment>
            <a href={`https://www.wikidata.org/wiki/Property:${this.props.pid}`}>{this.props.pid}</a>
            {" "}·{" "}
            {this.props.propNames[this.props.pid || ""] ?? "«no description»"}
        </React.Fragment>;

        return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={this.props.identifier ?? "«no label»"} subheader={pidLink}/>
            {!this.props.linked ?
            <CardContent>
                <Button style={{width: "100%"}} startIcon={<AddIcon />} variant="contained" color="primary" onClick={this.link.bind(this)}>Link</Button>
            </CardContent> : null
            }
        </Card>;
        }
    });

    interface CoordLinkWindowProps extends CloseParam, WithStyles<typeof styles> {
        pageQid?: string;
        broker: MessageBroker;
        pid: string;
        lat: number;
        lon: number;
        linked: boolean;
        propNames: {[key: string]: string};
    
    }
    
    const CoordLinkWindow = withStyles(styles)(
        class extends Component<CoordLinkWindowProps, {}> {
            constructor(props: CoordLinkWindowProps) {
                super(props);
            }
    
            link (): void {
                if (!this.props.linked && !!this.props.pageQid) {
                    this.props.broker.sendMessage({
                        type: MessageType.SET_PROP_COORD,
                        payload: {
                            sourceItemQid: this.props.pageQid,
                            propId: this.props.pid,
                            lat: this.props.lat,
                            lon: this.props.lon,
                            sourceUrl: getSourceUrl()
                        }
                    });
                    this.close();
                }
            }
    
            close = () => {
                !!this.props.close ? this.props.close() : null;
            }
    
            render() {
            const pidLink = <React.Fragment>
                <a href={`https://www.wikidata.org/wiki/Property:${this.props.pid}`}>{this.props.pid}</a>
                {" "}·{" "}
                {this.props.propNames[this.props.pid || ""] ?? "«no description»"}
            </React.Fragment>;
    
            let coordString = this.props.lat + ", " + this.props.lon;

            return <Card elevation={3} className={this.props.classes.card}>
                <CardHeader title={coordString} subheader={pidLink}/>
                {!this.props.linked ?
                <CardContent>
                    <Button style={{width: "100%"}} startIcon={<AddIcon />} variant="contained" color="primary" onClick={this.link.bind(this)}>Link</Button>
                </CardContent> : null
                }
            </Card>;
            }
        });    