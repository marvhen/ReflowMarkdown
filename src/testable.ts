import { TextEditor, Selection, Position, TextLine, WorkspaceConfiguration } from "vscode";


const HYPERLINK_REGEX = /\[.*?\]/g;

export interface Indents {
    firstLine: string;
    otherLines: string;
    blockQuoteLevel: number;
}

export class OtherInfo {
  isHeadingDash: boolean;
  indents: Indents;
  constructor() {
      this.isHeadingDash = false;
      this.indents = {
          blockQuoteLevel: 0,
          firstLine: "",
          otherLines: ""
      };
  }
}

export interface StartEndInfo {
    lineStart: number;
    lineEnd: number;
    otherInfo: OtherInfo;
}

enum wrapLongLinksOptions {
    wrap = "wrap",
    doNotWrap = "doNotWrap"
}
export interface Settings  {
    preferredLineLength: number,
    doubleSpaceBetweenSentences: boolean,
    resizeHeaderDashLines: boolean,
    wrapLongLinks: wrapLongLinksOptions
}

const DEFAULTSETTINGS : Settings = {
    preferredLineLength: 80,
    doubleSpaceBetweenSentences: false,
    resizeHeaderDashLines: true,
    wrapLongLinks: wrapLongLinksOptions.wrap
};

export function wordIsLink(word: string) {
    return word.match(HYPERLINK_REGEX);
}

export function lineTooLong(line: string, wrapAt: number): boolean {
    return line.length > wrapAt;
}

export function entireWordByItselfTooLong(word: string, wrapAt: number): boolean {
    return !wordIsLink(word) && lineTooLong(word, wrapAt);
}

export function lineIsSentenceEnd(line: string): RegExpMatchArray | null {
    return line.match(/[.!?]"?$/);
}

function lineConsistsOnlyOfTheIndents(line: string, lineIndex: number, sei: StartEndInfo): boolean {
    return ((lineIndex === 0 && line === sei.otherInfo.indents.firstLine) ||
            (lineIndex !== 0 && line === sei.otherInfo.indents.otherLines));
}

// replaces spaces within link text (in square brackets) with another character
// that is highly unlikely to be present.  The \x08 (backspace) character is a
// good candidate...
export function replaceSpacesInLinkTextWithBs(txt: string): string {
    return txt.replace(HYPERLINK_REGEX, (substr, ...args) => {
        return substr.replace(/\s/g, "\x08"); // x08 is hex ascii code for the 'backspace' character
    });

}

// replaces spaces within inline code (surrounded by either one or two
// back-ticks) with the \0x08 (backspace) character
export function replaceSpacesInInlineCodeWithBs(txt: string): string {
    return txt.replace(/`(`([^`]|`[^`])*`|.*?)`/g, (substr, ...args) => {
        return substr.replace(/\s/g, "\x08"); // x08 is hex ascii code for the 'backspace' character
    });
}

export function removeBlockQuoteFormatting(txt: string, blockQuoteLevel: number): string {
    // if we are in a blockQuote (or nested blockQuote), then remove the line-feeds and greater-than signs
    // a the beginning of each line and replace them with spaces.  we will restore them afterwards...
    if (blockQuoteLevel > 0) {
        return txt.replace(/(^|\n)\s*(>\s*)+/g, " ");
    } else {
        return txt;
    }
}

// true if text is zero or more spaces + [ (1 or more digits + 1 decimal) OR (1 dash or asterisk) ] + 1 or more spaces
export function getListStart(text: string): RegExpMatchArray | null {
    return text.match(/^\s*((\d+\.)|([-\*]))(\s+)/);
}

// line beginning + [zero or more spaces + 1 greater than sign](one-or-more)
export function getBlockQuote(text: string): RegExpMatchArray | null {
    return text.match(/^(\s*>)+/);
}

export function markdownBlockQuoteLevelFromRegExMatch(matchArray: RegExpMatchArray | null): number {
    if (matchArray && matchArray.length) {
        return matchArray[0].replace(/\s/g, "").length;
    } else {
        return 0;
    }
}

export function isEmptyBlockQuote(text: string): boolean {
    return text.match(/^(\s*>)+\s*$/) !== null;
}

export function isMarkdownHeadingHash(text: string): boolean {
    return text.startsWith("#");
}

export function isMarkdownHeadingDash(text: string): boolean {
    return text.startsWith("==") || text.startsWith("--");
}

export function markdownBlockQuoteLevelFromString(text: string): number {
    return markdownBlockQuoteLevelFromRegExMatch(getBlockQuote(text));
}

export function getFencedCodeBlockDelimiter(text: string): RegExpMatchArray | null {
    return text.match(/^(\s*```)/);
}

export function getLineIndent(firstNonWhitespaceCharacterIndex: number, text: string): Indents {

    let startLnSpaces = " ".repeat(firstNonWhitespaceCharacterIndex);

    let regExMatches = getListStart(text);
    if (regExMatches) {
        return {
            firstLine: startLnSpaces,
            otherLines: " ".repeat(regExMatches[0].length),
            blockQuoteLevel: 0
        };
    }

    regExMatches = getBlockQuote(text);
    if (regExMatches) {
        var level =  markdownBlockQuoteLevelFromRegExMatch(regExMatches);
        var indent = startLnSpaces + "> ".repeat(level);
        return {
            firstLine: indent,
            otherLines: indent,
            blockQuoteLevel: level
        };
    }

    return {
        firstLine: startLnSpaces,
        otherLines: startLnSpaces,
        blockQuoteLevel: 0
    };
}

// helper for integration testing....aygni?
export function goToLine(activeTextEditor: TextEditor,
                         selectionCtor1: new (anchor: Position, active: Position) => Selection,
                         selectionCtor2: new (anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number) => Selection,
                         oneBasedLine: number, selectWholeLine: boolean) {
    let zeroBasedLine = oneBasedLine - 1;
    let range = activeTextEditor.document.lineAt(zeroBasedLine).range;

    activeTextEditor.selection = selectWholeLine
                     ? new selectionCtor1(range.start, range.end)
                     : new selectionCtor2(zeroBasedLine, 0, zeroBasedLine, 0);

    activeTextEditor.revealRange(range);
}

// is is just an alias for readability
let lineBeingBuiltAlreadyTooLong = lineTooLong;


// the main reflow loop
export function getReflowedText(sei: StartEndInfo, text: string, settings: Settings): string {

    text = removeBlockQuoteFormatting(text, sei.otherInfo.indents.blockQuoteLevel);
    text = replaceSpacesInLinkTextWithBs(text);
    text = replaceSpacesInInlineCodeWithBs(text);

    let listStart = getListStart(text);
    let spacesAfterListMarker = " ";
    if (listStart) {
        spacesAfterListMarker = listStart[4];
    }

    let spaceBetweenSentences =  settings.doubleSpaceBetweenSentences ? "  " : " ";
    let words = text.split(/\s/);
    let newLines: string[] = [];
    let lineBeingBuilt = sei.otherInfo.indents.firstLine;
    let spaces = "";
    let lineToPush: string|null = null;
    let longestLineLength = 0;

    words.forEach((word, i) => {

        if (word !== "") {
            var lineBeingBuiltWithSpacesAndWord = lineBeingBuilt.concat(spaces).concat(word);

            // if the previous iteration determined we are ready to add the line then do that first
            if (lineToPush) {
                longestLineLength = lineToPush.length > longestLineLength ?  lineToPush.length : longestLineLength;
                newLines.push(lineToPush);
                lineToPush = null;
            }

            // logic to add this word to the line being built and determine if the line is ready to push
            if (sei.otherInfo.isHeadingDash && isMarkdownHeadingDash(word)) {
                lineToPush = lineBeingBuilt;
                longestLineLength = lineToPush.length > longestLineLength ?  lineToPush.length : longestLineLength;
                lineBeingBuilt = word.charAt(0).repeat(longestLineLength);
            } else if (entireWordByItselfTooLong(word, settings.preferredLineLength)) {
                if (spaces === "") {
                    lineToPush = lineBeingBuilt.concat(word);
                } else {
                    lineToPush = lineBeingBuilt;
                    lineBeingBuilt = sei.otherInfo.indents.otherLines.concat(word);
                }
            } else if (lineBeingBuiltAlreadyTooLong(lineBeingBuilt, settings.preferredLineLength)) {
                lineToPush = lineBeingBuilt;
                lineBeingBuilt = sei.otherInfo.indents.otherLines.concat(word);
            } else if (wordIsLink(word)) {
                if (lineBeingBuiltWithSpacesAndWord.length < settings.preferredLineLength) {
                    lineBeingBuilt = lineBeingBuiltWithSpacesAndWord;
                } else if (settings.wrapLongLinks === wrapLongLinksOptions.doNotWrap) {
                    lineBeingBuilt = lineBeingBuiltWithSpacesAndWord;
                } else  { //settings.wrapLongLinks == wrapHyperlinksOptions.wrap
                    lineToPush = lineBeingBuilt;
                    lineBeingBuilt = sei.otherInfo.indents.otherLines.concat(word);
                }
            } else if (lineTooLong(lineBeingBuiltWithSpacesAndWord, settings.preferredLineLength)) {
                lineToPush = lineBeingBuilt;
                lineBeingBuilt = sei.otherInfo.indents.otherLines.concat(word);
            } else {
                lineBeingBuilt = lineBeingBuiltWithSpacesAndWord;
            }

            // determine how many spaces will separate this word and the next
            if (listStart && i === 0) {
                spaces = spacesAfterListMarker;
            } else if (lineIsSentenceEnd(lineBeingBuilt)) {
                spaces = spaceBetweenSentences;
            } else if (lineConsistsOnlyOfTheIndents(lineBeingBuilt, i, sei)) {
                spaces = "";
            } else {
                spaces = " ";
            }
        }

    });

    // if the original text ended with 2 spaces, restore it
    if (text.endsWith("  ")) {
        if (lineToPush) {
            lineToPush = (lineToPush as string).concat("  ");
        } else {
            lineBeingBuilt += "  ";
        }
    }

    if (lineToPush) {
        newLines.push(lineToPush);
        lineToPush = null;
    }

    // the final line may not have been added yet.
    if (lineBeingBuilt.length > 0) {
        newLines.push(lineBeingBuilt);
    }

    // reflowedText is constructed with \n for line-endings;
    // textEditorEdit.replace will insert the correct environment-specific line-endings
    let reflowedText = newLines.join("\n");

    // replace \x08 (backspace) characters within link text (in square brackets) with spaces
    reflowedText = reflowedText.replace(/\[.*?\x08.*?]/g, (substr, ...args) => {
        return substr.replace(/\x08/g, " "); // x08 is hex ascii code for the 'backspace' character
    });

    // replace \x08 (backspace) characters within inline code (surrounded by back-ticks) with spaces
    reflowedText = reflowedText.replace(/`(`([^`]|`[^`])*`|.*?)`/g, (substr, ...args) => {
        return substr.replace(/\x08/g, " "); // x08 is hex ascii code for the 'backspace' character
    });

    return reflowedText;
}

export function getStartLine(lineAtFunc: (line: number) => TextLine, midLine: TextLine): TextLine {

    // If we are at line 0, the middleLine is the start line
    if (midLine.lineNumber === 0) {
        return midLine;
    }

    // If the current line is empty, it is a start line
    if (midLine.isEmptyOrWhitespace ) {
        return midLine;
    }

    // If the current line is an empty blockquote line, it is a start line
    if (isEmptyBlockQuote(midLine.text)) {
        return midLine;
    }

    // If the current line is a hash heading, the current line is a start point
    if (isMarkdownHeadingHash(midLine.text)) {
        return midLine;
    }

    if (getListStart(midLine.text)) {
        return midLine;
    }

    let prevLine = lineAtFunc(midLine.lineNumber - 1);

    // If the prev line is empty, this line is the start
    if (prevLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the prev line is an empty blockquote line, this line is the start
    if (isEmptyBlockQuote(prevLine.text)) {
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
    if (getFencedCodeBlockDelimiter(prevLine.text)) {
        return midLine;
    }

    // in [gitlab flavored] markdown, once blockQuotes nesting begins into a deeper level, it doesn't
    // back out into a shallower level.  Therefore, the start is only when the prevLine is lower than this line.
    var bqLevelMid = markdownBlockQuoteLevelFromString(midLine.text);
    var bqLevelPrv = markdownBlockQuoteLevelFromString(prevLine.text);
    if (bqLevelMid !== bqLevelPrv) {
        return midLine;
    }

    return getStartLine(lineAtFunc, prevLine);
}

export function getEndLine(lineAtFunc: (line: number) => TextLine, midLine: TextLine, maxLineNum: number, o: OtherInfo): TextLine {

    // if midLine is the last line it is the end
    if (midLine.lineNumber === maxLineNum) {
        return midLine;
    }

    // If the current line is empty, it is an end point
    if (midLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the current line is an empty blockquote line, it is an end point
    if (isEmptyBlockQuote(midLine.text)) {
        return midLine;
    }

    // If the current line is a hash it is a end point
    if (isMarkdownHeadingHash(midLine.text)) {
        return midLine;
    }

    // If the current line is a dash heading, it is a end point
    if (isMarkdownHeadingDash(midLine.text)) {
        o.isHeadingDash = true;
        return midLine;
    }

    // If the current line ends with two, spaces, it is an end point
    if (midLine.text.endsWith("  ")) {
        return midLine;
    }

    let nextLine = lineAtFunc(midLine.lineNumber + 1);

    // if the next line is empty, this line is the end
    if (nextLine.isEmptyOrWhitespace) {
        return midLine;
    }

    // If the next line is an empty blockquote line, this line is the end
    if (isEmptyBlockQuote(nextLine.text)) {
        return midLine;
    }

    // If the next line is a hash heading, IT is the end
    if (isMarkdownHeadingDash(nextLine.text)) {
        o.isHeadingDash =  true;
        return nextLine;
    }

    // if the next line starts a list, this line is the end
    if (getListStart(nextLine.text)) {
        return midLine;
    }

    // If the next line delimits a fenced code block, this line is the end
    if (getFencedCodeBlockDelimiter(nextLine.text)) {
        return midLine;
    }

    // in [gitlab flavored] markdown, once blockQuotes nesting begins into a deeper level, it doesn't
    // back out into a shallower level.  Therefore, the end is only when the nextLine level is greater than this line level.
    var bqLevelMid = markdownBlockQuoteLevelFromString(midLine.text);
    var bqLevelNxt = markdownBlockQuoteLevelFromString(nextLine.text);
    if (bqLevelMid > 0 && (bqLevelNxt === 0 || bqLevelNxt > bqLevelMid)) {
            return midLine;
    }

    return getEndLine(lineAtFunc, lineAtFunc(midLine.lineNumber + 1), maxLineNum, o);
}

// returns the settings from the specified config or the defaults if wsConfig is null
export function getSettings(wsConfig?: WorkspaceConfiguration): Settings {
    if (wsConfig) {
        return {
            preferredLineLength: wsConfig.get("preferredLineLength", DEFAULTSETTINGS.preferredLineLength),
            doubleSpaceBetweenSentences: wsConfig.get("doubleSpaceBetweenSentences", DEFAULTSETTINGS.doubleSpaceBetweenSentences),
            resizeHeaderDashLines: wsConfig.get("resizeHeaderDashLines", DEFAULTSETTINGS.resizeHeaderDashLines),
            wrapLongLinks: wsConfig.get("wrapLongLinks", DEFAULTSETTINGS.wrapLongLinks)
        };
    } else {
        return DEFAULTSETTINGS;
    }
}