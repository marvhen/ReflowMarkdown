// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { StartEndInfo,
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

    return  {
        lineStart: s.lineNumber,
        lineEnd: e.lineNumber,
        otherInfo: o        
    };

}