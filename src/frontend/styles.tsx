import { createStyles } from '@material-ui/core/styles';

export const styles = createStyles({
    orb: {
        //color: "#198754",
        //color: "#6c757d",
        fontSize: "smaller",
        fontStyle: "normal",
        fontWeight: "normal",
        "&:hover": {
            "filter": "contrast(500%) blur(1px) saturate(150%)",
        },
        "&::after": {
            "content": "\"\\2b24\""
        },
        "text-decoration": "none",
        "outline": "0",
        "cursor": "pointer"
    },
    orbTitle: {
        verticalAlign: "super",
        fontSize: "medium"
    },
    hoverText: {
        fontSize: "large"
    },
    hoverTip: {
        textAlign: "center",
        "& a": {
            color: "#2bdb56"
        }
    },
    connectedOrb: {
        color: "#2bdb56",
    },
    disconnectedOrb: {
        color: "#6c757d"
    },
    violationOrb: {
        color: "#db2b46"
    },
    loadingOrb: {
        color: "#562bdb",
        animation: "$pulse 2s infinite"
    },
    "@keyframes pulse": {
        "0%": {
            filter: "none"
        },
        "50%": {
            filter: "contrast(500%) blur(3px) saturate(150%)",
        },
    },

    hiddenOrb: {
        display: "none"
    },
    card: {
        maxWidth: 500,
        minWidth: 350
    },
    titleCardContent: {
        textAlign: "right"
    },
    suggestedStatementsBody: {
        textAlign: "left"
    },
});
