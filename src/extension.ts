import * as vscode from "vscode";
import { replaceSpacesInLinkTextWithBs,
         replaceSpacesInInlineCodeWithBs,
         Indents,
         StartEndInfo,
         getLineIndent,
         isListStart,
         isBlockQuote,
         markdownBlockQuoteLevelFromRegExMatch,
         isMarkdownHeadingHash,
         isMarkdownHeadingDash,
         markdownBlockQuoteLevelFromString,
         isFencedCodeBlockDelimiter,
        } from "./testable";

/* TODOS
* configurable:     
    * insert linebreaks as-you-type
*/

export function reflow() {

    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No open text editor
    }

    let wsConfig = vscode.workspace.getConfiguration("reflowMarkdown");

    let wrapAt = GetPreferredLineLength(wsConfig);
    let spaceBetweenSentences = GetDoubleSpaceBetweenSentences(wsConfig) ? "  " : " ";

    const selection = editor.selection;
    const position = editor.selection.active;
    let sei = GetStartEndInfo(editor);

    let maxLineNo = editor.document.lineCount;
    let len = editor.document.lineAt(sei.lineEnd).text.length;
    let range = new vscode.Range(sei.lineStart, 0, sei.lineEnd, len);
    let text = editor.document.getText(range);
    let listStart = isListStart(text);
    let spacesAfterListMarker = " ";
    if (listStart) {
        spacesAfterListMarker = listStart[4];
    }

    // if we are in a blockQuote (or nested blockQuote), then remove the line-feeds and greater-than signs
    // a the beginning of each line and replace them with spaces.  we will restore them afterwards...
    if (sei.indents.blockQuoteLevel > 0) {
        text = text.replace(/(^|\n)\s*(>\s*)+/g, " ");
    }

    text = replaceSpacesInLinkTextWithBs(text);
    text = replaceSpacesInInlineCodeWithBs(text);

    let words = text.split(/\s/);

    let newLines: string[] = [];
    let curLine = sei.indents.firstLine;
    let curMaxLineLength = wrapAt;

    words.forEach((word, i) => {
        if (word !== "") {

            // if the current line length is already longer than the max length, push it to the new lines array
            // OR if our word does NOT start with a left square bracket (i.e. is not a .md hyperlink) AND
            // if adding it and a space would make the line longer than the max length, also push it to the new lines array
            if (curLine.length > curMaxLineLength || (word[0] != "[" && curLine.length + 1 + word.length > curMaxLineLength)) {
                newLines.push(curLine.replace(/\s*$/, ''));  //remove trailing whitespace
                curLine = sei.indents.otherLines;
            } 
            
            let spaces = " ";
            if (listStart && i == 0) {
                spaces = spacesAfterListMarker;
            } else if (word.match(/[.!?]"?$/)) {
                spaces = spaceBetweenSentences;
            }
            curLine = curLine.concat(word).concat(spaces);
        }
    });

    curLine = curLine.replace(/\s*$/, '');  //remove trailing whitespace

    // if the original text ended with 2 spaces, restore it
    if (text.endsWith("  ")) {
        curLine += "  ";
    }  


    // the final line will be in curLine
    if (curLine.length > 0) {
        newLines.push(curLine);
    }

    // newParagraph is constructed with \n for line-endings; 
    // textEditorEdit.replace will insert the correct environment-specific line-endings 
    let newParagraph = newLines.join("\n");

    // replace \x08 (backspace) characters within link text (in square brackets) with spaces
    newParagraph = newParagraph.replace(/\[.*?\x08.*?]/g, (substr, ...args) => {
        return substr.replace(/\x08/g, " "); // x08 is hex ascii code for the 'backspace' character
    });

    // replace \x08 (backspace) characters within inline code (surrounded by back-ticks) with spaces
    newParagraph = newParagraph.replace(/`(`([^`]|`[^`])*`|.*?)`/g, (substr, ...args) => {
        return substr.replace(/\x08/g, " "); // x08 is hex ascii code for the 'backspace' character
    });

    let applied = editor.edit(
        function (textEditorEdit) {
            textEditorEdit.replace(range, newParagraph);
        }
    );

    // reset selection (TODO may be contraintuitive... maybe rather reset to single position, always?)
    editor.selection = selection;

    return applied;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand("extension.reflowMarkdown", reflow);
    context.subscriptions.push(disposable);
}

export function deactivate() {
}

function GetPreferredLineLength(wsConfig: vscode.WorkspaceConfiguration): number {
    return wsConfig.get("preferredLineLength", 80);
}

function PreserveIndent(wsConfig: vscode.WorkspaceConfiguration): boolean {
    return wsConfig.get("preserveIndent", true);
}

function GetDoubleSpaceBetweenSentences(wsConfig: vscode.WorkspaceConfiguration): boolean {
    return wsConfig.get("doubleSpaceBetweenSentences", false);
}

export function GetStartEndInfo(editor: vscode.TextEditor): StartEndInfo {

    const midLineNum = editor.selection.active.line;
    let midLine = editor.document.lineAt(midLineNum);
    let maxLineNum = editor.document.lineCount - 1; //line NUMBER is line COUNT minus 1

    let s = GetStartLine(editor, midLine);
    let e = GetEndLine(editor, midLine, maxLineNum);
    let i = getLineIndent(s.firstNonWhitespaceCharacterIndex, s.text);

    return  {
        lineStart: s.lineNumber,
        lineEnd: e.lineNumber,
        indents: i        
    };

}

function GetStartLine(editor: vscode.TextEditor, midLine: vscode.TextLine): vscode.TextLine {

    // If we are at line 0, the middleLine is the start line
    if (midLine.lineNumber == 0) { 
        return midLine;
    }
      
    // If the current line is empty, it is a start line
    if (midLine.isEmptyOrWhitespace ) {
        return midLine;        
    }

    // If the current line is a hash heading, the current line is a start point
    if (isMarkdownHeadingHash(midLine.text) || isMarkdownHeadingDash(midLine.text)) {
        return midLine;
    }

    if (isListStart(midLine.text)) {
        return midLine;
    }

    let prevLine = editor.document.lineAt(midLine.lineNumber - 1);
    
    // If the prev line is empty, this line is the start
    if (prevLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the prev line is a hash or dash heading, this line is the start
    if (isMarkdownHeadingHash(prevLine.text) || isMarkdownHeadingDash(prevLine.text)) {
        return midLine;
    }

    // If the prev line ends with two, spaces, it is an end point    
    if (prevLine.text.endsWith("  ")) {
        return midLine;
    }

    // If the prev line delimits a fenced code block, this line is the start 
    if (isFencedCodeBlockDelimiter(prevLine.text)) {
        return midLine;
    }

    // in [gitlab flavored] markdown, once blockQuotes nesting begins into a deeper level, it doesn't 
    // back out into a shallower level.  Therefore, the start is only when the prevLine is lower than this line.
    var bqLevelMid = markdownBlockQuoteLevelFromString(midLine.text);
    var bqLevelPrv = markdownBlockQuoteLevelFromString(prevLine.text);
    if (bqLevelMid != bqLevelPrv) {
        return midLine;
    }
    
    return GetStartLine(editor, prevLine);
}

function GetEndLine(editor: vscode.TextEditor, midLine: vscode.TextLine, maxLineNum: number): vscode.TextLine {

    // if midLine is the last line it is the end 
    if (midLine.lineNumber == maxLineNum) {
        return midLine;
    }

    // If the current line is empty, it is an end point
    if (midLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the current line is a hash or dash heading, it is a end point
    if (isMarkdownHeadingHash(midLine.text) || isMarkdownHeadingDash(midLine.text)) {
        return midLine;
    }

    // If the current line ends with two, spaces, it is an end point    
    if (midLine.text.endsWith("  ")) {
        return midLine;
    }
    
    let nextLine = editor.document.lineAt(midLine.lineNumber + 1);

    // if the next line is empty, this line is the end
    if (nextLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the next line is a hash heading, this line is the end
    if (isMarkdownHeadingDash(nextLine.text)) {
        return midLine;
    }

    // if the next line starts a list, this line is the end
    if (isListStart(nextLine.text)) {
        return midLine;
    }

    // If the next line delimits a fenced code block, this line is the end 
    if (isFencedCodeBlockDelimiter(nextLine.text)) {
        return midLine;
    }
    
    // in [gitlab flavored] markdown, once blockQuotes nesting begins into a deeper level, it doesn't 
    // back out into a shallower level.  Therefore, the end is only when the nextLine level is greater than this line level.
    var bqLevelMid = markdownBlockQuoteLevelFromString(midLine.text);
    var bqLevelNxt = markdownBlockQuoteLevelFromString(nextLine.text);
    if (bqLevelMid > 0 && (bqLevelNxt == 0 || bqLevelNxt > bqLevelMid)) {
            return midLine;
    }

    return GetEndLine(editor, editor.document.lineAt(midLine.lineNumber + 1), maxLineNum);
}

