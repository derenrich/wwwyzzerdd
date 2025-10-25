import HelpIcon from "@mui/icons-material/Help";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import React, { useCallback, useMemo, useState } from "react";
import { FrontendMessageBroker, MessageType } from "../messageBroker";
import { StatementSuggestions } from "../psychiq";
import { CloseParam, QidData, getSourceUrl } from "./common";
import { styles } from "./styles";

interface SuggestedClaimsWindowProps extends CloseParam {
  pageQid?: string;
  suggestedClaims: StatementSuggestions[];
  propNames: { [key: string]: string };
  qidMapping: { [key: string]: QidData };
  claims: { [key: string]: any };
  broker: FrontendMessageBroker;
  wikiLanguage?: string;
  claimExists: (pid: string, qid: string) => boolean;
}

export const SuggestedClaimsWindow: React.FC<SuggestedClaimsWindowProps> = (
  props
) => {
  const [statements, setStatements] = useState<string[]>([]);

  const {
    close: closeWindow,
    propNames,
    qidMapping,
    claimExists,
    suggestedClaims,
    broker,
    pageQid,
    wikiLanguage,
  } = props;

  const handleClose = useCallback(() => {
    closeWindow?.();
  }, [closeWindow]);

  const getPropName = useCallback(
    (pid: string): string => {
      return propNames[pid] ?? pid;
    },
    [propNames]
  );

  const getQidName = useCallback(
    (qid: string): string => {
      for (const data of Object.values(qidMapping)) {
        if (data.qid === qid) {
          return data.label ?? qid;
        }
      }
      return qid;
    },
    [qidMapping]
  );

  const handleClickStatement = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      const value = event.target.value;
      setStatements((current) => {
        if (checked) {
          return current.concat(value);
        }
        return current.filter((entry) => entry !== value);
      });
    },
    []
  );

  const visibleClaims = useMemo(() => {
    return suggestedClaims
      .filter((claim) => claim.pid !== "unknown")
      .slice(0, 5);
  }, [suggestedClaims]);

  const renderSuggestedClaims = () => (
    <FormGroup sx={styles.suggestedStatementsBody}>
      {visibleClaims.map((claim) => {
        const linked = claimExists(claim.pid, claim.qid);
        const value = `${claim.pid}-${claim.qid}`;
        return (
          <FormControlLabel
            key={value}
            disabled={linked}
            control={
              <Checkbox
                onChange={handleClickStatement}
                value={value}
                defaultChecked={linked}
              />
            }
            label={`${getPropName(claim.pid)} ${getQidName(claim.qid)}`}
          />
        );
      })}
    </FormGroup>
  );

  const handleSave = useCallback(() => {
    statements.forEach((statement) => {
      const [pid, targetQid] = statement.split("-");
      broker.sendMessage({
        type: MessageType.SET_PROP_QID,
        payload: {
          sourceItemQid: pageQid,
          propId: pid,
          targetItemQid: targetQid,
          sourceUrl: getSourceUrl(),
          wikiLanguage,
          commentAddendum: "via psychiq",
        },
      });
    });
    handleClose();
  }, [broker, handleClose, pageQid, statements, wikiLanguage]);

  return (
    <Card elevation={3} sx={styles.card}>
      <CardHeader
        title={chrome.i18n.getMessage("suggestedStatements")}
        action={
          <Tooltip
            placement="right-start"
            title={chrome.i18n.getMessage("suggestedStatementsDesc")}
            arrow
          >
            <HelpIcon />
          </Tooltip>
        }
      />
      <CardContent sx={styles.titleCardContent}>
        {renderSuggestedClaims()}
        <Button onClick={handleSave} variant="outlined" startIcon={<AddIcon />}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
};
