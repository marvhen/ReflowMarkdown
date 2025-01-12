// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  StartEndInfo,
  getLineIndent,
  getReflowedText,
  getStartLine,
  getEndLine,
  getSettings,
  OtherInfo
} from "./testable";

export function reflow() {

  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a file first to use Reflow Markdown.');
    return;
  }

  let settings = getSettings(vscode.workspace.getConfiguration("reflowMarkdown"));

  const selection = editor.selection;
  const position = editor.selection.active;
  let sei = GetStartEndInfo(editor);

  let len = editor.document.lineAt(sei.lineEnd).text.length;
  let range = new vscode.Range(sei.lineStart, 0, sei.lineEnd, len);
  let text = editor.document.getText(range);

  let reflowedText = getReflowedText(sei, text, settings);
  let applied = editor.edit(
    function (textEditorEdit) {
      textEditorEdit.replace(range, reflowedText);
    }
  );

  // reset selection (TODO may be contra-intuitive... maybe rather reset to single position, always?)
  editor.selection = selection;

  return applied;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("reflow-markdown.reflowMarkdown", reflow);
  context.subscriptions.push(disposable);
}

export function deactivate() {
}

export function GetStartEndInfo(editor: vscode.TextEditor): StartEndInfo {

  const midLineNum = editor.selection.active.line;
  let midLine = editor.document.lineAt(midLineNum);
  let maxLineNum = editor.document.lineCount - 1; //max line NUMBER is line COUNT minus 1
  let lineAtFunc = (line: number) => { return editor.document.lineAt(line); };

  let o = new OtherInfo();
  let s = getStartLine(lineAtFunc, midLine);
  let e = getEndLine(lineAtFunc, midLine, maxLineNum, o);
  o.indents = getLineIndent(s.firstNonWhitespaceCharacterIndex, s.text);

  return {
    lineStart: s.lineNumber,
    lineEnd: e.lineNumber,
    otherInfo: o
  };

}

export function GetStartEndInfoFile(document: vscode.TextDocument): StartEndInfo {
  const maxLineNum = document.lineCount - 1; // max line NUMBER is line COUNT minus 1
  let midLineNum = 0; // Start from the first line
  let midLine = document.lineAt(midLineNum);

  // Check for frontmatter and skip until the next ---
  if (midLine.text.trim().startsWith('---')) {
    midLineNum++; // Move to the next line
    midLine = document.lineAt(midLineNum);

    // Continue until we find the closing ---
    while (midLineNum <= maxLineNum && !midLine.text.trim().startsWith('---')) {
      midLineNum++;
      if (midLineNum <= maxLineNum) {
        midLine = document.lineAt(midLineNum);
      }
    }

    // If we reached the end of the document without finding a closing ---
    if (midLineNum > maxLineNum) {
      midLineNum--; // Adjust to the last valid line
    }
  }

  let lineAtFunc = (line: number) => { return document.lineAt(line); };

  let o = new OtherInfo();
  let s = getStartLine(lineAtFunc, midLine);
  let e = getEndLine(lineAtFunc, midLine, maxLineNum, o);
  o.indents = getLineIndent(s.firstNonWhitespaceCharacterIndex, s.text);

  return {
    lineStart: s.lineNumber,
    lineEnd: e.lineNumber,
    otherInfo: o
  };
}

vscode.languages.registerDocumentFormattingEditProvider('markdown', {
  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    // Load the user settings
    let settings = getSettings(vscode.workspace.getConfiguration("reflowMarkdown"));

    // Only format if the user has enabled it
    if (settings.formatOnSave !== true) {
      return [];
    }

    // Get all the text in the document
    let text = document.getText();

    let sei = GetStartEndInfoFile(document);
    // Get the text of the end line to determine its length
    let endLineText = document.lineAt(sei.lineEnd).text;
    let endCharacter = endLineText.length;

    let range = new vscode.Range(sei.lineStart, 0, sei.lineEnd, endCharacter);
    let reflowedText = getReflowedText(sei, text, settings);

    return [vscode.TextEdit.replace(range, reflowedText)];
  }
});