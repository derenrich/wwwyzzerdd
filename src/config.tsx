import Switch from '@material-ui/core/Switch';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import CircularProgress from '@material-ui/core/CircularProgress';

import React, { Component } from 'react';
import ReactDom from "react-dom";

export const CONFIG_KEY = "WYZRD_CONFIG"
export function getConfig(): Promise<ConfigObject> {
    return new Promise<ConfigObject>(function (resolve, reject) {
        chrome.storage.sync.get(CONFIG_KEY,
            function(result: any) {
                if (result[CONFIG_KEY]) {
                    resolve(result[CONFIG_KEY]);
                } else {
                    // initialize the config
                    chrome.storage.sync.set({
                        [CONFIG_KEY]: {}
                    });
                    reject();
                }
        });
    });
}

export interface ConfigObject {
    syncd: boolean;
    showOrbs?: boolean;
}

class Config extends Component<{}, ConfigObject> {
    constructor(props: {}) {
        super(props);
        this.state = {
            syncd: false
        };
        this.updateConfig();
    }

    updateConfig() {
        getConfig().then((conf) => {
            this.setState(conf);
            this.setState({
                syncd: true
            });
        });
    }

    handleShowOrbChange(evt: React.ChangeEvent<{}>, checked: boolean) {
        const update = {
            showOrbs: checked
        }
        let newState = Object.assign(this.state, update);

        chrome.storage.sync.set({
            [CONFIG_KEY]: newState
        }, () => this.updateConfig());

    }

    render() {
        if (this.state.syncd) {
            return <React.Fragment> 
            <FormGroup>
                <FormControlLabel control={<Switch checked={this.state.showOrbs} onChange={this.handleShowOrbChange.bind(this)} />} label="Show Orbs" />
            </FormGroup>
            </React.Fragment>;
        } else {
            return <CircularProgress />;
        }
    }
}


function boot() {
    const settingDiv = document.getElementById("settings");
    ReactDom.render(<Config />, settingDiv);
}

window.onload = boot;