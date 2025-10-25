import { keyframes } from "@mui/material/styles";

export const pulseAnimation = keyframes`
  0% {
    filter: none;
  }
  50% {
    filter: contrast(500%) blur(3px) saturate(150%);
  }
`;

export const styles = {
  orb: {
    fontSize: "smaller",
    fontStyle: "normal",
    fontWeight: "normal",
    "&:hover": {
      filter: "contrast(500%) blur(1px) saturate(150%)",
    },
    "&::after": {
      content: '"\\2b24"',
    },
    textDecoration: "none",
    outline: "0",
    cursor: "pointer",
  },
  orbTitle: {
    verticalAlign: "super",
    fontSize: "medium",
  },
  hoverText: {
    fontSize: "large",
  },
  hoverTip: {
    textAlign: "center",
    "& a": {
      color: "#2bdb56",
    },
  },
  connectedOrb: {
    color: "#2bdb56",
  },
  disconnectedOrb: {
    color: "#6c757d",
  },
  violationOrb: {
    color: "#db2b46",
  },
  loadingOrb: {
    color: "#562bdb",
    animation: `${pulseAnimation} 2s infinite`,
  },
  hiddenOrb: {
    display: "none",
  },
  card: {
    maxWidth: 500,
    minWidth: 350,
  },
  titleCardContent: {
    textAlign: "right",
  },
  suggestedStatementsBody: {
    textAlign: "left",
  },
};
