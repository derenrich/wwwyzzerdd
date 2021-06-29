import { render } from "react-dom";
import React, { Component } from 'react';
import { withStyles, createStyles, WithStyles } from '@material-ui/core/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Switch from '@material-ui/core/Switch';
import CircularProgress from '@material-ui/core/CircularProgress';
import {Settings, getSettings, setSettings} from "./settings"


const styles = createStyles({

});

interface State { //extends WithStyles<typeof styles> {
    settings?: Settings;
}

export const Options = withStyles(styles)(
    class extends Component<{}, State> {

        constructor(props: {}) {
            super(props);
            this.state = {
                settings: undefined
            };

            getSettings().then((settings) => {
                this.setState({settings: settings})
            });
        }

        setRunOnLoad = (evt:any) => {
            if (this.state.settings) {
                let settings = this.state.settings;
                settings.runOnLoad = evt.target.checked;
                setSettings(settings)
                this.setState({settings: settings})
            }
        }

        render() {
            if (!this.state || !this.state.settings) {
                return <div> <CircularProgress /></div>;
            } else {
            return <FormControl component="fieldset">
              <FormControlLabel
                control={<Switch name="runOnLoad" />}
                checked={this.state.settings.runOnLoad}
                label="Run On Load"
                onChange={this.setRunOnLoad.bind(this)}
              />
                </FormControl>;
            }
        }
    }
);



render(<Options />, document.getElementById("root"));
