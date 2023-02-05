import React, { Component } from 'react';
import {CloseParam} from "./common";
import { withStyles, WithStyles } from '@material-ui/core/styles';
import {styles} from "./styles";
import Tooltip from '@material-ui/core/Tooltip';
import Popover from '@material-ui/core/Popover';


export const enum OrbMode {
    Unknown = 1,
    Unlinked = 2,
    Linked = 3,
    Loading = 4
}

interface OrbProps extends WithStyles<typeof styles> {
    mode: OrbMode;
    hover?: React.ReactNode;
    popover?: React.ReactElement<CloseParam>;
    hidden?: boolean;
    location?: string;
}

interface OrbState {
    targetElement?: HTMLElement;
}

export const Orb = withStyles(styles)(class extends Component<OrbProps, OrbState> {
    constructor(props: OrbProps) {
        super(props);
        this.state = {};
    }

    handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>):boolean => {
        this.setState({targetElement: event.currentTarget});
        event.stopPropagation();
        event.preventDefault();
        return false;
    };

    handlePopoverClose = () => {
        this.setState({targetElement: undefined});
    };

    render() {
        let orbClass: string = "";
        if (this.props.mode == OrbMode.Unknown || this.props.hidden) {
            orbClass = this.props.classes.hiddenOrb;
        } else if (this.props.mode == OrbMode.Unlinked) {
            orbClass = this.props.classes.disconnectedOrb;
        }  else if (this.props.mode == OrbMode.Linked) {
            orbClass = this.props.classes.connectedOrb;
        } else if (this.props.mode == OrbMode.Loading) {
            orbClass = this.props.classes.loadingOrb;
        }
        let classes = [orbClass, this.props.classes.orb]
        if (this.props.location === "title") {
            // apply special styling for orbs in the title
            classes = classes.concat(this.props.classes.orbTitle);
        }
        return <React.Fragment>
        <Tooltip title={this.props.hover ?? ""}>
         <span
            onClick={this.handlePopoverOpen}
            className={classes.join(" ")}>
        </span>
        </Tooltip>
        <Popover open={!!this.state.targetElement && !!this.props.popover} anchorEl={this.state.targetElement} onClose={this.handlePopoverClose.bind(this)}>
            {!! this.props.popover ? React.cloneElement(this.props.popover, {close: this.handlePopoverClose.bind(this)}) : undefined}
        </Popover>
        </React.Fragment>;
    }
});
