import {SelectionData} from "../context";


function setAsStartContext(elm:HTMLElement) {

    elm.className += " ww-selection ww-selection-before";
}

function setAsEndContext(elm:HTMLElement) {
    elm.className += " ww-selection ww-selection-after";
}


export function insertSpan(selection: SelectionData): HTMLElement | undefined {
    if (selection.text.length > 200) {
        throw Error("Selection is too long.")
    }

    let sel = window.getSelection();
    if (sel) {
        if (sel.isCollapsed) {
            throw Error("Selection is too short.");
        }

        let anchor = sel.anchorNode;
        let focus = sel.focusNode;
        let anchorParent = anchor?.parentNode;
        let focusParent = anchor?.parentNode;

        if (!anchor || !focus || !anchorParent || !focusParent) {
            throw Error("Selection ends in an invalid region");
        } else if (anchor == focus && anchor?.nodeType != Node.TEXT_NODE) {
            if (anchor.nodeType == Node.ELEMENT_NODE) {
                if (anchor.nodeName == "LI" || anchor.nodeName == "TD" || anchor.nodeName == "DIV") {
                    let start = sel.anchorOffset < sel.focusOffset ? sel.anchorOffset : sel.focusOffset;
                    let end = sel.anchorOffset < sel.focusOffset ? sel.focusOffset : sel.anchorOffset;
                    let node = anchor as HTMLElement;
                    let initialSize = node.childNodes.length;
                    let addedNodes = 0;
                    if (start === 0) {
                        setAsStartContext(node);
                    } else {
                        let startNode = node.childNodes[start];
                        if (startNode.nodeType == Node.ELEMENT_NODE) {
                            setAsStartContext(startNode as HTMLElement);
                        } else {
                            const startSentinel = document.createElement('span');
                            node.insertBefore(startSentinel, startNode);
                            setAsStartContext(startSentinel);
                            addedNodes += 1;
                        }
                    }
                    const spanNode = document.createElement('span');
                    if (end === initialSize) {
                        setAsEndContext(node);
                        node.appendChild(spanNode);
                    } else {
                        // maybe specially handle cases where endNode is a <br />?
                        let endNode = node.childNodes[end + addedNodes];
                        setAsEndContext(spanNode as HTMLElement);
                        node.insertBefore(spanNode, endNode.nextSibling);
                    }
                    return spanNode;
                }
            }
            throw Error("Selection includes non-text. Report this as a bug.")
        } else if (anchor === focus && anchor.nodeType == Node.TEXT_NODE) {
            // simple case where both offsets are in the same node
            let start = sel.anchorOffset < sel.focusOffset ? sel.anchorOffset : sel.focusOffset;
            let end = sel.anchorOffset < sel.focusOffset ? sel.focusOffset : sel.anchorOffset;

            let textNode = anchor as Text;
            if (textNode.textContent && textNode.textContent[start] === ' ') {
                start += 1;
            }
            if (textNode.textContent && textNode.textContent[end - 1] === ' ') {
                end -= 1;
            }
            if (start >= end) {
                throw Error("Selection contains no content");
            }
            let tnode = textNode.splitText(start);
            let insertBeforeElm = tnode.splitText(end - start);

            const spanNode = document.createElement('span');
            tnode.remove();
            spanNode.appendChild(tnode);
            setAsStartContext(spanNode);
            setAsEndContext(spanNode);
            anchorParent.insertBefore(spanNode, insertBeforeElm);
            return spanNode;
        } else if (anchor !== focus && anchor.nodeType == Node.TEXT_NODE && focus.nodeType == Node.TEXT_NODE) {
            // slightly easy case. both are in text nodes but they are not the same ones
            // first figure out which is first the anchor or the focus
            let comp = anchor.compareDocumentPosition(focus);
            let left = anchor as Text;
            let right = focus as Text;
            let leftOffset = sel.anchorOffset;
            let rightOffset = sel.focusOffset;

            if (comp & Node.DOCUMENT_POSITION_PRECEDING ) {
                // focus is before comp; we selected backwards
                [left, right] = [right, left];
                [leftOffset, rightOffset] = [rightOffset, leftOffset];
            }

            // ok now we have the two sides. first slice the left side properly.
            if (left.textContent && left.textContent[leftOffset] === ' ') {
                leftOffset += 1;
            }
            let leftRemainder = left.splitText(leftOffset);
            const leftSpanNode = document.createElement('span');
            leftRemainder.remove();
            leftSpanNode.appendChild(leftRemainder);
            left.parentElement?.insertBefore(leftSpanNode, left.nextSibling);
            setAsStartContext(leftSpanNode);

            // now slice the right side and add the orb

            if (right.textContent && right.textContent[rightOffset - 1] === ' ') {
                rightOffset -= 1;
            }
            let rightRemainder = right.splitText(rightOffset);
            const rightSpanNode = document.createElement('span');
            right.remove();
            rightSpanNode.appendChild(right);
            rightRemainder.parentElement?.insertBefore(rightSpanNode, rightRemainder);
            setAsEndContext(rightSpanNode);
            return rightSpanNode;
        } else {
            throw Error("Could not parse text. Still under development. Try selecting again. If this persists report a bug.")
        }
    }
    throw Error("Unknown error occured");
}