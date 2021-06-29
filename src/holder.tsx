import React, { Component } from 'react';
import Portal from '@material-ui/core/Portal';

import {registerFrontendBroker, MessageType, Message, GetQidsReply, GetClaimsReply, GetPropNamesReply, GetLinkIdentifierReply} from "./messageBroker";
import {PropertySuggestions} from "./propertyData";
import {LinkedItemData} from "./itemData";


interface HolderProps {
    pageTitle: string;
    wikiLinks: HTMLElement[];
}

interface HolderState {
    wikiLinks: HTMLAnchorElement[];
    externalLinks: HTMLAnchorElement[];
}

export class WwwyzzerddHolder extends Component<HolderProps, HolderState> {
    constructor(props: HolderProps) {
        super(props);
        this.state = {
            wikiLinks: [],
            externalLinks: []
        };
    }

    addWikiLink(elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                wikiLinks: state.wikiLinks.concat(elm)
            };
        });
    }

    addExternalLink(elm: HTMLAnchorElement) {
        this.setState(function(state: HolderState) {
            return {
                externalLinks: state.externalLinks.concat(elm)
            };
        });
    }



    render() {
        return <React.Fragment>
            {this.state.wikiLinks.map((link) => {
                return <Portal container={link}><span>foo bar</span></Portal> ;
            })}
        </React.Fragment>;
    }
}
