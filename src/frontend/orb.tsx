import React, { Component } from 'react';
import {CloseParam} from "./common";
import { withStyles, WithStyles } from '@material-ui/core/styles';
import {styles} from "./styles";
import Tooltip from '@material-ui/core/Tooltip';
import Popover from '@material-ui/core/Popover';
import { Typography } from '@material-ui/core';

export const enum OrbMode {
    Unknown = 1,
    Unlinked = 2,
    Linked = 3,
    Loading = 4,
    Violation = 5
}

interface OrbProps extends WithStyles<typeof styles> {
    mode: OrbMode;
    hover?: React.ReactNode;
    hoverWarning?: React.ReactNode;
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
        } else if (this.props.mode == OrbMode.Violation) {
            orbClass = this.props.classes.violationOrb;
        }
        let classes = [orbClass, this.props.classes.orb]
        if (this.props.location === "title") {
            // apply special styling for orbs in the title
            classes = classes.concat(this.props.classes.orbTitle);
        }
        let hoverElement = (this.props.hover || this.props.hoverWarning) ? <Typography className={this.props.classes.hoverTip}>
            {this.props.hover}
            {(this.props.hover && this.props.hoverWarning) ? <br /> : "" }
            <React.Fragment>{this.props.hoverWarning ? (chrome.i18n.getMessage("constraintViolation") + ": "): null}{this.props.hoverWarning}</React.Fragment>
        </Typography> : "";

        return <React.Fragment>
        <Tooltip title={hoverElement}>
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
