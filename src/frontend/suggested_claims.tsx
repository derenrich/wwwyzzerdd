import HelpIcon from '@material-ui/icons/Help';
import IconButton from '@material-ui/core/IconButton';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import {FrontendMessageBroker, MessageType} from "../messageBroker";
import {StatementSuggestions} from "../psychiq";
import React, { Component } from 'react';
import {styles} from "./styles";
import {CloseParam, QidData, getSourceUrl} from "./common";
import { Checkbox, FormControlLabel, FormGroup, Typography } from '@material-ui/core';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import AddIcon from '@material-ui/icons/Add';


interface SuggestedClaimsWindowProps extends CloseParam, WithStyles<typeof styles> {
    pageQid?: string;
    suggestedClaims: StatementSuggestions[];
    propNames: {[key: string]: string};
    qidMapping: {[key: string]: QidData};
    claims: {[key: string]: any};
    broker: FrontendMessageBroker;
    wikiLanguage?: string;
    claimExists: (pid: string, qid: string) => boolean;
}

interface SuggestedClaimsWindowState {
    statements: string[];
}

export const SuggestedClaimsWindow = withStyles(styles)(
    class extends Component<SuggestedClaimsWindowProps, SuggestedClaimsWindowState> {
        constructor(props: SuggestedClaimsWindowProps) {
            super(props);
            this.state = {
                statements: []
            };
        }

        close = () => {
            !!this.props.close ? this.props.close() : null;
        }

        getPropName(pid: string): string {
            return this.props.propNames[pid] ?? pid;
        }

        getQidName(qid: string): string {
            // yes this is O(n) ...
            for (let data of Object.values(this.props.qidMapping)) {
                if (data.qid == qid) {
                    return data.label ?? qid;
                }
            }
            return qid;
        }

        clickStatement(event: React.ChangeEvent<HTMLInputElement>, checked: boolean): void {
            let value = event.target.value;
            if (checked) {
                this.setState((state) => {
                    return {
                        statements: state.statements.concat(value)
                    }
                });
            } else {
                this.setState((state) => {
                    return {
                        statements: state.statements.filter(v => v != value)
                    }
            }   );
            }
        }

        renderSuggestedClaims(): React.ReactNode {
            let claims = this.props.suggestedClaims.filter((r) => r.pid != "unknown").slice(0, 5);
            return <FormGroup className={this.props.classes.suggestedStatementsBody}>
                {claims.map((c) => {
                    let linked = this.props.claimExists(c.pid, c.qid);
                    return <FormControlLabel
                        control={<Checkbox  onChange={this.clickStatement.bind(this)} value={c.pid + "-" + c.qid} defaultChecked={linked}/>}
                        disabled={linked}
                        label={this.getPropName(c.pid) + " " + this.getQidName(c.qid)} />
                })}
            </FormGroup>
        }

        save(): void {
            this.state.statements.forEach((statement) => {
                let [pid, targetQid] = statement.split("-");
                this.props.broker.sendMessage({
                    type: MessageType.SET_PROP_QID,
                    payload: {
                        sourceItemQid: this.props.pageQid,
                        propId: pid,
                        targetItemQid: targetQid,
                        sourceUrl: getSourceUrl(),
                        wikiLanguage: this.props.wikiLanguage,
                        commentAddendum: "via psychiq"
                    }
                });
            });
            this.close();
        }

        render() {
            return <Card elevation={3} className={this.props.classes.card}>
                <CardHeader title={"Suggested Statements"} action={
                    <Tooltip placement='right-start' title="These are statements that we predict are applicable to this item. Click the checkbox and hit save to add them to the item." arrow>
                    <HelpIcon />
                  </Tooltip>
                }/>
                <CardContent className={this.props.classes.titleCardContent}>
                    {this.renderSuggestedClaims()}
                    <Button onClick={this.save.bind(this)} variant="outlined" startIcon={<AddIcon />}>
                        Save
                    </Button>
                </CardContent>
            </Card>;
        }
});
