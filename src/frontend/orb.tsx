import React, { Component } from "react";
import { CloseParam } from "./common";
import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import { Typography } from "@mui/material";
import { styles } from "./styles";

export const enum OrbMode {
  Unknown = 1,
  Unlinked = 2,
  Linked = 3,
  Loading = 4,
  Violation = 5,
}

const StyledOrb = styled("span")<{
  mode: OrbMode;
  location?: string;
  hidden?: boolean;
}>(({ theme, mode, location, hidden }) => {
  let baseStyles = styles.orb;

  let modeStyles = {};
  if (mode === OrbMode.Unknown || hidden) {
    modeStyles = styles.hiddenOrb;
  } else if (mode === OrbMode.Unlinked) {
    modeStyles = styles.disconnectedOrb;
  } else if (mode === OrbMode.Linked) {
    modeStyles = styles.connectedOrb;
  } else if (mode === OrbMode.Loading) {
    modeStyles = styles.loadingOrb;
  } else if (mode === OrbMode.Violation) {
    modeStyles = styles.violationOrb;
  }

  let titleStyles = {};
  if (location === "title") {
    titleStyles = styles.orbTitle;
  }

  return {
    ...baseStyles,
    ...modeStyles,
    ...titleStyles,
  };
});


interface OrbProps {
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

export class Orb extends Component<OrbProps, OrbState> {
  constructor(props: OrbProps) {
    super(props);
    this.state = {};
  }

  handlePopoverOpen = (
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ): boolean => {
    this.setState({ targetElement: event.currentTarget });
    event.stopPropagation();
    event.preventDefault();
    return false;
  };

  handlePopoverClose = () => {
    this.setState({ targetElement: undefined });
  };

  render() {
    let hoverElement =
      this.props.hover || this.props.hoverWarning ? (
        <Typography sx={styles.hoverTip}>
          {this.props.hover}
          {this.props.hover && this.props.hoverWarning ? <br /> : ""}
          <React.Fragment>
            {this.props.hoverWarning
              ? chrome.i18n.getMessage("constraintViolation") + ": "
              : null}
            {this.props.hoverWarning}
          </React.Fragment>
        </Typography>
      ) : (
        ""
      );

    return (
      <React.Fragment>
        <Tooltip title={hoverElement}>
          <StyledOrb
            onClick={this.handlePopoverOpen}
            mode={this.props.mode}
            location={this.props.location}
            hidden={this.props.hidden}
          />
        </Tooltip>
        <Popover
          open={!!this.state.targetElement && !!this.props.popover}
          anchorEl={this.state.targetElement}
          onClose={this.handlePopoverClose.bind(this)}
        >
          {!!this.props.popover
            ? React.cloneElement(this.props.popover, {
                close: this.handlePopoverClose.bind(this),
              })
            : undefined}
        </Popover>
      </React.Fragment>
    );
  }
}
