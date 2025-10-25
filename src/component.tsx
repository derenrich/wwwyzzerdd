import React, { useCallback, useMemo, useState } from "react";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import AddIcon from "@mui/icons-material/Add";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import LinkIcon from "@mui/icons-material/Link";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import { styles as sharedStyles } from "./frontend/styles";

interface Props {
  linkElm: string;
  linkHref: string;
  forcePid?: string;
  qid: string | undefined;
  label: string | undefined;
  description: string | undefined;
  claims: { [key: string]: any };
  propNames: { [key: string]: string };
  getSuggestion: (qid: string, typed: string) => Promise<any>;
  addClaim: (sourceQid: string, prop: string, target: string) => Promise<any>;
  addIdClaim: (sourceQid: string, prop: string, target: string) => Promise<any>;
  pageQid: { [key: string]: string };
}

interface ItemWindowProps extends Props {
  propItems: React.ReactNode[];
  popoverClose: () => void;
}

type PropertyOption = { pid: string; label: string };

export const ItemWindow: React.FC<ItemWindowProps> = (props) => {
  const {
    addClaim,
    description,
    label,
    pageQid,
    popoverClose,
    propItems,
    propNames,
    qid,
  } = props;

  const [isAdding, setIsAdding] = useState(false);
  const [selectedProp, setSelectedProp] = useState<PropertyOption | null>(null);

  const propertyOptions = useMemo<PropertyOption[]>(
    () => Object.keys(propNames).map((pid) => ({ pid, label: propNames[pid] })),
    [propNames]
  );

  const handleStartAdd = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleClose = useCallback(() => {
    popoverClose();
    setIsAdding(false);
    setSelectedProp(null);
  }, [popoverClose]);

  const handleSetProperty = useCallback(() => {
    if (selectedProp && qid) {
      handleClose();
      void addClaim(pageQid["qid"], selectedProp.pid, qid);
    }
  }, [addClaim, handleClose, pageQid, qid, selectedProp]);

  const qidLink = (
    <React.Fragment>
      <a href={`https://www.wikidata.org/wiki/${qid}`}>{qid}</a> ·{" "}
      {description ?? "«no description»"}
    </React.Fragment>
  );

  return (
    <Card elevation={3} sx={sharedStyles.card}>
      <CardHeader title={label ?? "«no label»"} subheader={qidLink} />
      <CardContent>
        <List dense component="nav">
          {propItems}
          {isAdding ? (
            <ListItem>
              <ListItemIcon>
                <IconButton
                  onClick={handleSetProperty}
                  disabled={!selectedProp}
                  size="large"
                >
                  <AddIcon />
                </IconButton>
              </ListItemIcon>
              <Autocomplete<PropertyOption, false, false, false>
                fullWidth
                autoHighlight
                autoSelect
                openOnFocus
                onChange={(_evt, option) => {
                  setSelectedProp(option ?? null);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Property" variant="outlined" />
                )}
                options={propertyOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) =>
                  option.pid === value.pid
                }
                value={selectedProp}
                id="prop-box"
              />
            </ListItem>
          ) : (
            <ListItemButton onClick={handleStartAdd}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Add Statement" />
            </ListItemButton>
          )}
        </List>
      </CardContent>
    </Card>
  );
};

interface IdWindowProps extends Props {
  popoverClose: () => void;
  linked: boolean;
}

export const IdWindow: React.FC<IdWindowProps> = (props) => {
  const {
    addIdClaim,
    forcePid,
    label,
    linked,
    pageQid,
    popoverClose,
    propNames,
  } = props;

  const handleLink = useCallback(() => {
    popoverClose();
    void addIdClaim(pageQid["qid"], forcePid || "", label || "");
  }, [addIdClaim, forcePid, label, pageQid, popoverClose]);

  const pidLink = (
    <React.Fragment>
      <a href={`https://www.wikidata.org/wiki/Property:${forcePid}`}>
        {forcePid}
      </a>{" "}
      · {propNames[forcePid || ""] ?? "«no description»"}
    </React.Fragment>
  );

  return (
    <Card elevation={3} sx={sharedStyles.card}>
      <CardHeader title={label ?? "«no label»"} subheader={pidLink} />
      {!linked ? (
        <CardContent>
          <Button
            sx={{ width: "100%" }}
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={handleLink}
          >
            Link
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
};

export const WWWLink: React.FC<Props> = (props) => {
  const { claims, forcePid, label, linkElm, linkHref, propNames, qid } = props;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const parseProp = useCallback(
    (pid: string) => {
      return propNames[pid] ?? pid;
    },
    [propNames]
  );

  const findMatchedQid = useCallback(() => {
    const matched: string[] = [];
    for (const value of Object.values(claims)) {
      const claimGroup = (value as any).claims;
      for (const prop of Object.keys(claimGroup)) {
        for (const statementV of Object.values(claimGroup[prop])) {
          const statement = statementV as any;
          if (
            statement.rank !== "deprecated" &&
            statement.mainsnak.datatype === "wikibase-item"
          ) {
            if (
              statement.mainsnak.datavalue &&
              statement.mainsnak.datavalue.value.id === qid
            ) {
              matched.push(prop as string);
            }
          }
        }
      }
    }
    return matched;
  }, [claims, qid]);

  const findForcedPid = useCallback(() => {
    const matched: string[] = [];
    const targetProp = forcePid || "";
    for (const value of Object.values(claims)) {
      const claimGroup = (value as any).claims;
      for (const statementV of Object.values(claimGroup[targetProp] || {})) {
        const statement = statementV as any;
        if (
          statement.rank !== "deprecated" &&
          statement.mainsnak.datatype === "external-id"
        ) {
          if (
            statement.mainsnak.datavalue &&
            statement.mainsnak.datavalue.value === label
          ) {
            matched.push(targetProp);
          }
        }
      }
    }
    return matched;
  }, [claims, forcePid, label]);

  const matchedProps = useMemo(
    () => (forcePid ? findForcedPid() : findMatchedQid()),
    [findForcedPid, findMatchedQid, forcePid]
  );

  const propItems = useMemo(
    () =>
      matchedProps.map((prop) => (
        <ListItem key={prop}>
          <ListItemIcon>
            <LinkIcon />
          </ListItemIcon>
          <ListItemText primary={parseProp(prop)} secondary={prop} />
        </ListItem>
      )),
    [matchedProps, parseProp]
  );

  const tooltipText = useMemo(
    () => matchedProps.map(parseProp).join(" & "),
    [matchedProps, parseProp]
  );
  const connected = matchedProps.length > 0;

  const handlePopoverOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      event.stopPropagation();
    },
    []
  );

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const popOver = forcePid ? (
    <IdWindow {...props} popoverClose={handlePopoverClose} linked={connected} />
  ) : (
    <ItemWindow
      {...props}
      popoverClose={handlePopoverClose}
      propItems={propItems}
    />
  );

  const orbStyles = useMemo(
    () => ({
      ...sharedStyles.orb,
      ...(connected ? sharedStyles.connectedOrb : sharedStyles.disconnectedOrb),
    }),
    [connected]
  );

  return (
    <React.Fragment>
      <a href={linkHref} dangerouslySetInnerHTML={{ __html: linkElm }} />
      <Tooltip
        title={
          tooltipText ? (
            <Typography sx={sharedStyles.hoverText}>{tooltipText}</Typography>
          ) : undefined
        }
      >
        <Box component="span" onClick={handlePopoverOpen} sx={orbStyles}>
          ⬤
        </Box>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
      >
        {popOver}
      </Popover>
    </React.Fragment>
  );
};
