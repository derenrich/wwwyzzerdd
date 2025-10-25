import { styles } from "./styles";
import { CloseParam, PropTuple } from "./common";
import {
  AddStringReq,
  FrontendMessageBroker,
  MessageType,
} from "../messageBroker";
import React, { useCallback, useMemo, useState } from "react";
import { getSourceUrl } from "./common";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import LinkIcon from "@mui/icons-material/Link";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Button from "@mui/material/Button";
import { Suggester, SuggesterMode } from "./suggester";
import AddIcon from "@mui/icons-material/Add";
import { ParsedDate } from "~parseString";

interface ItemWindowProps extends CloseParam {
  broker: FrontendMessageBroker;
  qid: string;
  pageQid?: string;
  label?: string;
  description?: string;
  existingProps: PropTuple[];
  wikiLanguage?: string;
}

export const ItemWindow: React.FC<ItemWindowProps> = (props) => {
  const {
    broker,
    close,
    description,
    existingProps,
    label,
    pageQid,
    qid,
    wikiLanguage,
  } = props;

  const [isAdding, setIsAdding] = useState(false);

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const handleStartAdd = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleAdd = useCallback(
    (pid?: string) => {
      if (pid && pageQid) {
        broker.sendMessage({
          type: MessageType.SET_PROP_QID,
          payload: {
            sourceItemQid: pageQid,
            propId: pid,
            targetItemQid: qid,
            sourceUrl: getSourceUrl(),
            wikiLanguage,
          },
        });
        handleClose();
      }
    },
    [broker, handleClose, pageQid, qid, wikiLanguage]
  );

  const propItems = useMemo(
    () =>
      existingProps.map((prop) => (
        <ListItem key={prop.propId}>
          <ListItemIcon>
            <LinkIcon />
          </ListItemIcon>
          <ListItemText primary={prop.propName ?? ""} secondary={prop.propId} />
        </ListItem>
      )),
    [existingProps]
  );

  const qidLink = (
    <React.Fragment>
      <a href={`https://www.wikidata.org/wiki/${qid}`}>{qid}</a> ·{" "}
      {description ?? "«no description»"}
    </React.Fragment>
  );

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader title={label ?? "«no label»"} subheader={qidLink} />
      <CardContent>
        <List dense component="nav">
          {propItems}
          {isAdding ? (
            <Suggester
              mode={SuggesterMode.QID_SUGGEST}
              targetQid={pageQid || ""}
              objectQid={qid}
              broker={broker}
              onSubmit={handleAdd}
            />
          ) : (
            <ListItemButton onClick={handleStartAdd}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary={chrome.i18n.getMessage("addStatement")} />
            </ListItemButton>
          )}
        </List>
      </CardContent>
    </Card>
  );
};

interface LinkWindowProps extends CloseParam {
  pageQid?: string;
  broker: FrontendMessageBroker;
  pid: string;
  identifier: string;
  linked: boolean;
  propNames: { [key: string]: string };
}

export const LinkWindow: React.FC<LinkWindowProps> = (props) => {
  const { broker, close, identifier, linked, pageQid, pid, propNames } = props;

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const handleLink = useCallback(() => {
    if (!linked && pageQid) {
      broker.sendMessage({
        type: MessageType.SET_PROP_ID,
        payload: {
          sourceItemQid: pageQid,
          propId: pid,
          targetId: identifier,
          sourceUrl: getSourceUrl(),
        },
      });
      handleClose();
    }
  }, [broker, handleClose, identifier, linked, pageQid, pid]);

  const pidLink = (
    <React.Fragment>
      <a href={`https://www.wikidata.org/wiki/Property:${pid}`}>{pid}</a> ·{" "}
      {propNames[pid || ""] ??
        "«" + chrome.i18n.getMessage("noDescription") + "»"}
    </React.Fragment>
  );

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader
        title={identifier ?? "«" + chrome.i18n.getMessage("noLabel") + "»"}
        subheader={pidLink}
      />
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

interface CoordLinkWindowProps extends CloseParam {
  pageQid?: string;
  broker: FrontendMessageBroker;
  pid: string;
  lat: number;
  lon: number;
  linked: boolean;
  propNames: { [key: string]: string };
}

export const CoordLinkWindow: React.FC<CoordLinkWindowProps> = (props) => {
  const { broker, close, lat, linked, lon, pageQid, pid, propNames } = props;

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const handleLink = useCallback(() => {
    if (!linked && pageQid) {
      broker.sendMessage({
        type: MessageType.SET_PROP_COORD,
        payload: {
          sourceItemQid: pageQid,
          propId: pid,
          lat,
          lon,
          sourceUrl: getSourceUrl(),
        },
      });
      handleClose();
    }
  }, [broker, handleClose, lat, linked, lon, pageQid, pid]);

  const pidLink = (
    <React.Fragment>
      <a href={`https://www.wikidata.org/wiki/Property:${pid}`}>{pid}</a> ·{" "}
      {propNames[pid || ""] ?? "«no description»"}
    </React.Fragment>
  );

  const coordString = `${lat}, ${lon}`;

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader title={coordString} subheader={pidLink} />
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

interface SpanWindowProps extends CloseParam {
  pageQid: string;
  broker: FrontendMessageBroker;
  spanText: string;
  wikiLanguage: string;
}

export const SpanWindow: React.FC<SpanWindowProps> = (props) => {
  const { broker, close, pageQid, spanText, wikiLanguage } = props;

  const [field, setField] = useState("alias");
  const [language, setLanguage] = useState(wikiLanguage);

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const handleFieldChange = useCallback((event: SelectChangeEvent<string>) => {
    setField(event.target.value);
  }, []);

  const handleLanguageChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setLanguage(event.target.value);
    },
    []
  );

  const handleLink = useCallback(() => {
    const payload: AddStringReq = {
      sourceItemQid: pageQid,
      sourceUrl: getSourceUrl(),
      wikiLanguage,
      language,
      field,
      text: spanText,
    };
    broker.sendMessage({
      type: MessageType.ADD_STRING,
      payload,
    });
    handleClose();
  }, [broker, field, handleClose, language, pageQid, spanText, wikiLanguage]);

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader title={`“${spanText}”`} subheader="string" />
      <CardContent sx={{ paddingTop: 0 }}>
        <FormControl sx={{ width: "50%" }}>
          <InputLabel>Field</InputLabel>
          <Select label="field" value={field} onChange={handleFieldChange}>
            <MenuItem value="label">{chrome.i18n.getMessage("label")}</MenuItem>
            <MenuItem value="description">
              {chrome.i18n.getMessage("description")}
            </MenuItem>
            <MenuItem value="alias">{chrome.i18n.getMessage("alias")}</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ width: "50%" }}>
          <InputLabel>{chrome.i18n.getMessage("language")}</InputLabel>
          <Select
            value={language}
            label="language"
            onChange={handleLanguageChange}
          >
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
        <Button
          sx={{ width: "100%", marginTop: "1em" }}
          startIcon={<AddIcon />}
          variant="contained"
          color="primary"
          onClick={handleLink}
        >
          Add
        </Button>
      </CardContent>
    </Card>
  );
};

interface SpanDateWindowProps extends CloseParam {
  pageQid: string;
  broker: FrontendMessageBroker;
  date: ParsedDate;
  wikiLanguage: string;
}

export const SpanDateWindow: React.FC<SpanDateWindowProps> = (props) => {
  const { broker, close, date, pageQid, wikiLanguage } = props;
  const [isAdding, setIsAdding] = useState(false);

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const handleStartAdd = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleAdd = useCallback(
    (pid?: string) => {
      if (pid && pageQid) {
        broker.sendMessage({
          type: MessageType.SET_PROP_DATE,
          payload: {
            sourceItemQid: pageQid,
            propId: pid,
            date: date.value,
            sourceUrl: getSourceUrl(),
            wikiLanguage,
          },
        });
        handleClose();
      }
    },
    [broker, date.value, handleClose, pageQid, wikiLanguage]
  );

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader title={date.renderedText} subheader="date" />
      <CardContent sx={{ paddingTop: 0 }}>
        {isAdding ? (
          <Suggester
            targetQid={pageQid}
            mode={SuggesterMode.DATE_SUGGEST}
            broker={broker}
            onSubmit={handleAdd}
          />
        ) : (
          <ListItemButton onClick={handleStartAdd}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary={chrome.i18n.getMessage("addStatement")} />
          </ListItemButton>
        )}
      </CardContent>
    </Card>
  );
};
