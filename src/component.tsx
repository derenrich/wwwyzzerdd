import React, { Children, Component } from 'react';
import { withStyles, createStyles, WithStyles } from '@material-ui/core/styles';
import Popover from '@material-ui/core/Popover';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import AddIcon from '@material-ui/icons/Add';
import List from '@material-ui/core/List';
import ListItem, { ListItemProps } from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LinkIcon from '@material-ui/icons/Link';
import TextField from '@material-ui/core/TextField';
// https://material-ui.com/api/autocomplete/ and https://material-ui.com/components/autocomplete/#customized-autocomplete   
import Autocomplete from '@material-ui/lab/Autocomplete';
import IconButton from '@material-ui/core/IconButton';



const styles = createStyles({
    orb: {
        fontSize: "smaller",
        fontStyle: "normal",
        fontWeight: "normal",
        "&:hover": {
            filter: "contrast(500%) blur(1px)"
        },
    },
    hoverText: {
        fontSize: "large"
    },
    connectedOrb: {
        color: "#198754",
    },
    disconnectedOrb: {
        color: "#6c757d"
    },
    card: {
        maxWidth: 500,
        minWidth: 350
    }
  });


interface Props extends WithStyles<typeof styles> {
    linkElm: string;
    linkHref: string;
    forcePid?: string;
    qid: string | undefined;
    label: string | undefined;
    description: string | undefined;
    claims: {[key: string]: any};
    propNames: {[key: string]: string};
    getSuggestion: (qid: string, typed:string) => Promise<any>;
    addClaim: (sourceQid: string, prop: string, target: string) => Promise<any>;
    addIdClaim: (sourceQid: string, prop: string, target: string) => Promise<any>;
    pageQid: {[key: string]: string};
}

interface State {
    target: HTMLElement | undefined;
    addMode: boolean;
    pid: string | undefined;
    selectedProp: {pid: string, label: string} | undefined;
}

interface ItemWindowProps extends Props {
    propItems: React.ReactNode[];
    popoverClose: () => void;
}


export const ItemWindow = withStyles(styles)(
    class extends Component<ItemWindowProps, State> {
        constructor(props: ItemWindowProps) {
            super(props);
            this.state = {
                target: undefined,
                addMode: false,
                pid: undefined,
                selectedProp: undefined
            };
        }

        addMode = () => {
            this.setState({
                addMode: true
            });
        };   

        handlePopoverClose = () => {
            this.props.popoverClose();
            this.setState({
                target: undefined,
                addMode: false,
                pid: undefined,
                selectedProp: undefined
            });
            
        };

        setProperty = (evt:any) => {
            if (this.state.selectedProp && this.props.qid) {
                this.handlePopoverClose();
                this.props.addClaim(this.props.pageQid["qid"], this.state.selectedProp.pid, this.props.qid);
            }
        }    

        render() {

            const qidLink = <React.Fragment>
                <a href={`https://www.wikidata.org/wiki/${this.props.qid}`}>{this.props.qid}</a>
                {" "}·{" "}
                {this.props.description ?? "«no description»"}
            </React.Fragment>;

            return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={this.props.label ?? "«no label»"} subheader={qidLink}/>
            <CardContent>
            <List dense component="nav" >                                    
            {this.props.propItems}
            {this.state.addMode ? 
            <ListItem>
            <ListItemIcon>
              <IconButton onClick={this.setProperty.bind(this)} disabled={!this.state.selectedProp}><AddIcon /></IconButton>
            </ListItemIcon>
            <Autocomplete
                fullWidth
                autoHighlight
                autoSelect
                openOnFocus
                onChange={(evt, obj, reason) => {
                    this.setState({"selectedProp": obj || undefined});
                }}
                renderInput={(params) => <TextField {...params} label="Property" variant="outlined"  />}
                options={Object.keys(this.props.propNames).map((pid) => {return {"pid": pid, "label": this.props.propNames[pid]};})}
                getOptionLabel={(opt) => opt.label}
                id="prop-box"  />
            </ListItem>
            :
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

interface IdWindowProps extends Props {
    popoverClose: () => void;
    linked: boolean;
}


export const IdWindow = withStyles(styles)(
    class extends Component<IdWindowProps, State> {
        constructor(props: IdWindowProps) {
            super(props);
            this.state = {
                target: undefined,
                addMode: false,
                pid: undefined,
                selectedProp: undefined
            };
        }

        handlePopoverClose = () => {
            this.props.popoverClose();
        };

        setProperty = (evt:any) => {
            this.handlePopoverClose();
            this.props.addIdClaim(this.props.pageQid["qid"], this.props.forcePid || "", this.props.label || "");
            //this.props.addClaim(this.props.pageQid["qid"], this.state.selectedProp.pid, this.props.qid);
        }    

        render() {

            const pidLink = <React.Fragment>
                <a href={`https://www.wikidata.org/wiki/Property:${this.props.forcePid}`}>{this.props.forcePid}</a>
                {" "}·{" "}
                {this.props.propNames[this.props.forcePid || ""] ?? "«no description»"}
            </React.Fragment>;

            return <Card elevation={3} className={this.props.classes.card}>
            <CardHeader title={this.props.label ?? "«no label»"} subheader={pidLink}/>
            {!this.props.linked ?
            <CardContent>
                <Button style={{width: "100%"}} startIcon={<AddIcon />} variant="contained" color="primary" onClick={this.setProperty.bind(this)}>Link</Button>
            </CardContent>
            : null
            }
        </Card>;

        }        
    }
)


export const WWWLink = withStyles(styles)(
    class extends Component<Props, State> {
        constructor(props: Props) {
            super(props);
            this.state = {
                target: undefined,
                addMode: false,
                pid: undefined,
                selectedProp: undefined
            };
        }

    handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        this.setState({target: event.currentTarget});
        event.stopPropagation();
    };

    handlePopoverClose = () => {
        this.setState({
            target: undefined,
            addMode: false,
            pid: undefined,
            selectedProp: undefined
        });

    };

    addMode = () => {
        this.setState({
            addMode: true
        });
    };


    parseProp = (pid: string) => {
        if (pid in this.props.propNames) {
            return this.props.propNames[pid];
        } else {
            return pid;
        }
    }
        
    setProperty = (evt:any) => {
        if (this.state.selectedProp && this.props.qid) {
            this.handlePopoverClose();
            this.props.addClaim(this.props.pageQid["qid"], this.state.selectedProp.pid, this.props.qid);
        }
    }


    findMatchedQid() {
        let matchedProps = []
        let d = this.props.claims;
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let prop of Object.keys(claims)) {
                for (let statementV of Object.values(claims[prop])) {
                    let statement = (statementV as any);
                    if (statement.rank != "deprecated" && statement.mainsnak.datatype == "wikibase-item") {
                        if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value.id == this.props.qid) {
                            matchedProps.push(prop);
                        }
                    }
                }
            }
        }
        return matchedProps;
    }

    findForcedPid() {
        let matchedProps = []
        let d = this.props.claims;
        let prop = this.props.forcePid || "";
        for (let k of Object.keys(d)) {
            let claims = d[k].claims;
            for (let statementV of Object.values(claims[prop] || {})) {                
                let statement = (statementV as any);
                if (statement.rank != "deprecated" && statement.mainsnak.datatype == "external-id") {
                    if (statement.mainsnak.datavalue && statement.mainsnak.datavalue.value == this.props.label) {
                        matchedProps.push(prop);
                    }
                }                
            }
        }
        return matchedProps;
    }


    render() {
        let matchedProps = this.props.forcePid ? this.findForcedPid() : this.findMatchedQid();
        let propItems = matchedProps.map((prop) => {
            return <ListItem>
                <ListItemIcon>
                  <LinkIcon />
                </ListItemIcon>
                <ListItemText primary={this.parseProp(prop)} secondary={prop} />
            </ListItem>;
        });
        let tooltip = matchedProps.map(this.parseProp).join(" & ");
        let connected = (matchedProps.length > 0);
        let orbClass = connected ? this.props.classes.connectedOrb : this.props.classes.disconnectedOrb;

        let popOver = this.props.forcePid ? 
            <IdWindow {...this.props} popoverClose={this.handlePopoverClose.bind(this)} linked={matchedProps.length > 0}/> :
            <ItemWindow {...this.props} propItems={propItems} popoverClose={this.handlePopoverClose.bind(this)}/>;

        const qidLink = <React.Fragment>
            <a href={`https://www.wikidata.org/wiki/${this.props.qid}`}>{this.props.qid}</a>
            {" "}·{" "}
            {this.props.description ?? "«no description»"}
            </React.Fragment>;
        return <React.Fragment>
            <a href={this.props.linkHref} dangerouslySetInnerHTML={{__html: this.props.linkElm}} />
            <Tooltip title={tooltip ? <Typography className={this.props.classes.hoverText}>{tooltip}</Typography> : ""}>
                <span onClick={this.handlePopoverOpen} className={[this.props.classes.orb, orbClass].join(" ")}>⬤</span>
            </Tooltip>            
            <Popover open={!!this.state.target} anchorEl={this.state.target} onClose={this.handlePopoverClose}>
            {popOver}
            </Popover>
        </React.Fragment>;
       
            
    }
});



