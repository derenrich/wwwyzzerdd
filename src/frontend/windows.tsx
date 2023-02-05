import { withStyles, WithStyles } from '@material-ui/core/styles';
import {styles} from "./styles";
import {CloseParam, PropTuple} from "./common";
import {AddStringReq, FrontendMessageBroker, MessageType} from "../messageBroker";
import React, { ChangeEvent, Component } from 'react';
import {getSourceUrl} from "./common";
import ListItem, { ListItemProps } from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LinkIcon from '@material-ui/icons/Link';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel  from '@material-ui/core/InputLabel';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import List from '@material-ui/core/List';
import Button from '@material-ui/core/Button';
import { Suggester, SuggesterMode } from './suggester';
import AddIcon from '@material-ui/icons/Add';
import { ParsedDate } from '~parseString';


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
                mode={SuggesterMode.QID_SUGGEST}
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


interface SpanWindowProps extends CloseParam, WithStyles<typeof styles> {
    pageQid: string;
    broker: FrontendMessageBroker;
    spanText: string;
    wikiLanguage: string;
}

interface SpanWindowState {
    field: string;
    language: string;
}


export const SpanWindow = withStyles(styles)(class extends Component<SpanWindowProps, SpanWindowState> {
    constructor(props: SpanWindowProps) {
        super(props);
        this.state = {
            field: "alias",
            language: this.props.wikiLanguage
        };
    }

    link (): void {
        let payload: AddStringReq = {
            sourceItemQid: this.props.pageQid,
            sourceUrl: getSourceUrl(),
            wikiLanguage: this.props.wikiLanguage,
            language: this.state.language,
            field: this.state.field,
            text: this.props.spanText
        }
        this.props.broker.sendMessage({
            type: MessageType.ADD_STRING,
            payload
        });
        this.close();
    }

    close = () => {
        !!this.props.close ? this.props.close() : null;
    }


    changeField(evt: any, child: any) {
        let fieldValue = evt.target.value;
        this.setState({
            field: fieldValue
        });
    } 

    changeLang(evt: any, child: any) {
        let langValue = evt.target.value;
        this.setState({
            language: langValue
        });
    }

    render() {
        return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={`“${this.props.spanText}”`} subheader={"string"}/>
            <CardContent style={{"paddingTop": "0px"}}>
                <FormControl style={{width: "50%"}}>
                    <InputLabel>Field</InputLabel>
                    <Select label="field" defaultValue="alias" onChange={this.changeField.bind(this)}>
                        <MenuItem value="label">Label</MenuItem>
                        <MenuItem value="description">Description</MenuItem>
                        <MenuItem value="alias">Alias</MenuItem>
                    </Select>
                </FormControl>
                <FormControl style={{width: "50%"}}>
                    <InputLabel>Language</InputLabel>
                    <Select defaultValue={this.props.wikiLanguage} label="language" onChange={this.changeLang.bind(this)}>
                        <MenuItem value="ar">Arabic</MenuItem>
                        <MenuItem value="be">Belarusian</MenuItem>
                        <MenuItem value="cs">Czech</MenuItem>
                        <MenuItem value="de">German</MenuItem>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="ja">Japanese</MenuItem>
                        <MenuItem value="pt">Portuguese</MenuItem>
                        <MenuItem value="ru">Russian</MenuItem>
                        <MenuItem value="sr">Serbian</MenuItem>
                        <MenuItem value="zh">Chinese</MenuItem>
                    </Select>
                </FormControl>
                <Button style={{width: "100%", marginTop: "1em"}} startIcon={<AddIcon />} variant="contained" color="primary" onClick={this.link.bind(this)}>Add</Button>
            </CardContent>
        </Card>;
    }
});


interface SpanDateWindowProps extends CloseParam, WithStyles<typeof styles> {
    pageQid: string;
    broker: FrontendMessageBroker;
    date: ParsedDate;
    wikiLanguage: string;
}

interface SpanDateWindowState {
    prop?: string;
    addMode: boolean;
}

export const SpanDateWindow = withStyles(styles)(class extends Component<SpanDateWindowProps, SpanDateWindowState> {
    constructor(props: SpanDateWindowProps) {
        super(props);
        this.state = {addMode: false};
    }
    close = () => {
        !!this.props.close ? this.props.close() : null;
    }

    addMode = () => {
        this.setState({
            addMode: true
        });
    };

    add (pid?: string): void {
        if (pid && this.props.pageQid) {
            this.props.broker.sendMessage({
                type: MessageType.SET_PROP_DATE,
                payload: {
                    sourceItemQid: this.props.pageQid,
                    propId: pid,
                    date: this.props.date.value,
                    sourceUrl: getSourceUrl(),
                    wikiLanguage: this.props.wikiLanguage
                }
            });
            this.close();
        }
    }

    render() {
        return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={`${this.props.date.renderedText}`} subheader={"date"}/>
            <CardContent style={{"paddingTop": "0px"}}>
            {this.state.addMode ?
            <Suggester
                targetQid={this.props.pageQid}
                mode={SuggesterMode.DATE_SUGGEST}
                broker={this.props.broker}
                onSubmit={this.add.bind(this)} />  :
            <ListItem button onClick={this.addMode}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add Statement" />
            </ListItem>
            }
            </CardContent>
        </Card>;
    }
});