import { render } from "react-dom";
import React, { useCallback, useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";
import { Settings, getSettings, setSettings } from "./settings";

export const Options: React.FC = () => {
  const [settings, setSettingsState] = useState<Settings>();

  useEffect(() => {
    let isMounted = true;
    getSettings().then((fetchedSettings) => {
      if (isMounted) {
        setSettingsState(fetchedSettings);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunOnLoadChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      if (!settings) {
        return;
      }
      const nextSettings = {
        ...settings,
        runOnLoad: checked,
      };
      void setSettings(nextSettings);
      setSettingsState(nextSettings);
    },
    [settings]
  );

  if (!settings) {
    return (
      <div>
        <CircularProgress />
      </div>
    );
  }

  return (
    <FormControl component="fieldset">
      <FormControlLabel
        control={
          <Switch
            name="runOnLoad"
            checked={settings.runOnLoad}
            onChange={handleRunOnLoadChange}
          />
        }
        label="Run On Load"
      />
    </FormControl>
  );
};

render(<Options />, document.getElementById("root"));
