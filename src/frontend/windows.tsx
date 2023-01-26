import { withStyles, WithStyles } from '@material-ui/core/styles';
import {styles} from "./styles";
import {CloseParam, PropTuple} from "./common";
import {FrontendMessageBroker, MessageType} from "../messageBroker";
import React, { Component } from 'react';
import {getSourceUrl} from "./common";
import ListItem, { ListItemProps } from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LinkIcon from '@material-ui/icons/Link';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import List from '@material-ui/core/List';
import Button from '@material-ui/core/Button';
import { Suggester } from './suggester';
import AddIcon from '@material-ui/icons/Add';


 interface ItemWindowProps extends CloseParam, WithStyles<typeof styles> {
     broker: FrontendMessageBroker;
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

 export const ItemWindow = withStyles(styles)(
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
                objectQid={this.props.qid}
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


interface LinkWindowProps extends CloseParam, WithStyles<typeof styles> {
    pageQid?: string;
    broker: FrontendMessageBroker;
    pid: string;
    identifier: string;
    linked: boolean;
    propNames: {[key: string]: string};

}

export const LinkWindow = withStyles(styles)(
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
        broker: FrontendMessageBroker;
        pid: string;
        lat: number;
        lon: number;
        linked: boolean;
        propNames: {[key: string]: string};

    }

    export const CoordLinkWindow = withStyles(styles)(
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


