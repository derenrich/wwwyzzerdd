import {SelectionData} from "../context";

export function insertSpan(selection: SelectionData): HTMLElement | undefined {
    let sel = window.getSelection();
    if (sel) {
        if (sel.isCollapsed) {
            console.error("empty selection");
            return;
        }

        if (sel.anchorNode != sel.focusNode) {
            console.error("selection spans HTML elements", sel);
            return;
        }
        let container = sel.getRangeAt(0).commonAncestorContainer;
        if (container.nodeType != Node.TEXT_NODE) {
            console.error("selection is not in a text node", sel);
            return;
        }
        if (!container.parentNode) {
            console.error("container has no parent", sel, container);
            return;
      }
        let start = sel.anchorOffset < sel.focusOffset ? sel.anchorOffset : sel.focusOffset;
        let end = sel.anchorOffset < sel.focusOffset ? sel.focusOffset : sel.anchorOffset;

        let textNode = container as Text;
        let tnode = textNode.splitText(start);
        let insertBeforeElm = tnode.splitText(end - start);

        const spanNode = document.createElement('span');
        spanNode.className = "ww-selection";
        tnode.remove();
        spanNode.appendChild(tnode);
        container.parentNode.insertBefore(spanNode, insertBeforeElm);
        return spanNode;
    }
    return undefined;
}