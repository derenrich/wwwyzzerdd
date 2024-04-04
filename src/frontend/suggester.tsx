import { FrontendMessageBroker, MessageType } from "../messageBroker";
import React, { Component } from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Autocomplete from '@material-ui/lab/Autocomplete';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import AddIcon from '@material-ui/icons/Add';
import { ParsedDate } from "~parseString";


export enum SuggesterMode {
    QID_SUGGEST,
    DATE_SUGGEST
}

interface SuggesterProps {
    mode: SuggesterMode;
    targetQid: string;
    objectQid?: string;
    broker: FrontendMessageBroker;
    onSubmit: (pid?: string) => void;
}

interface Suggestion {
    id: string;
    label: string;
};

interface SuggesterState {
    typed: string;
    selectedPid?: string;
    // apparently we're never using this?
    propNames: { [key: string]: string };
    suggestedProps: Suggestion[];
}

/**
 * React component that suggests properties
 */
export class Suggester extends Component<SuggesterProps, SuggesterState> {

    constructor(props: SuggesterProps) {
        super(props);
        this.state = {
            suggestedProps: [],
            propNames: {},
            typed: ""
        };
        this.props.broker.registerFrontendHandler(MessageType.GET_PROP_SUGGESTIONS, (resp: any) => {
            this.setState({
                suggestedProps: resp.suggestions
            });
        });
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
        this.props.broker.sendMessage({
            type: MessageType.GET_PROP_SUGGESTIONS,
            payload: {
                itemQid: this.props.targetQid,
                targetQid: this.props.objectQid, // yes the variable naming here is bad (sorry)
                typed: this.state.typed,
                mode: this.props.mode == SuggesterMode.QID_SUGGEST ? "qid" : "date"
            }
        });
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
                <IconButton onClick={this.submit.bind(this)}>
                    <AddIcon />
                </IconButton>
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
                    this.setState({ "selectedPid": !!obj ? obj['pid'] : undefined });
                }}
                filterOptions={(x) => x}
                renderInput={(params) => <TextField {...params} label="Property" variant="outlined" />}
                options={this.state.suggestedProps.map((sugg) => { return { "pid": sugg.id, "label": sugg.label }; })}
                getOptionLabel={(opt) => opt.label}
                id="prop-box" />
        </ListItem>;
    }
}
