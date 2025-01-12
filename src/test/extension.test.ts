import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  replaceSpacesInLinkTextWithBs,
  replaceSpacesInInlineCodeWithBs,
  getListStart,
  getBlockQuote,
  lineTooLong,
  getReflowedText,
  StartEndInfo,
  getLineIndent,
  getStartLine,
  getEndLine,
  Settings,
  getSettings,
  OtherInfo
} from "../testable";

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test("replaceSpacesInLinkTextWithBs", () => {
    assert.strictEqual(replaceSpacesInLinkTextWithBs("[abc]"             /**/), "[abc]"                   /**/);
    assert.strictEqual(replaceSpacesInLinkTextWithBs("xxx[abc]xxx"       /**/), "xxx[abc]xxx"             /**/);
    assert.strictEqual(replaceSpacesInLinkTextWithBs("[a b]"             /**/), "[a\x08b]"                /**/);
    assert.strictEqual(replaceSpacesInLinkTextWithBs("asdf [a b a] asdf" /**/), "asdf [a\x08b\x08a] asdf" /**/);
  });

  test("replaceSpacesInInlineCodeWithBs", () =>{
    assert.strictEqual(replaceSpacesInInlineCodeWithBs("`abc`"       /**/), "`abc`"               /**/);
    assert.strictEqual(replaceSpacesInInlineCodeWithBs("`a b`"       /**/), "`a\x08b`"            /**/);
    assert.strictEqual(replaceSpacesInInlineCodeWithBs("``abc``"     /**/), "``abc``"             /**/);
    assert.strictEqual(replaceSpacesInInlineCodeWithBs("``a b``"     /**/), "``a\x08b``"          /**/);
    assert.strictEqual(replaceSpacesInInlineCodeWithBs("``a ` b``"   /**/), "``a\x08`\x08b``"     /**/);
  });
  test("getListStart", () => {
    assert.ok(getListStart("1. "      /**/));
    assert.ok(getListStart(" 1. "     /**/));
    assert.ok(getListStart("  1. "    /**/));
    assert.ok(getListStart("99. "     /**/));
    assert.ok(getListStart(" 99. "    /**/));
    assert.ok(getListStart("  99. "   /**/));
    assert.ok(getListStart("* "       /**/));
    assert.ok(getListStart("* abc"    /**/));
    assert.ok(getListStart("*  "      /**/));
    assert.ok(getListStart("*  abc"   /**/));
    assert.ok(getListStart("- "       /**/));
    assert.ok(getListStart("- abc"    /**/));
    assert.ok(getListStart("-  "      /**/));
    assert.ok(getListStart("-  abc"   /**/));
    assert.ok(!getListStart("  1."     /**/));
    assert.ok(!getListStart("  1.abc"  /**/));
    assert.ok(!getListStart("  99."    /**/));
    assert.ok(!getListStart("  99.abc" /**/));
    assert.ok(!getListStart("*"        /**/));
    assert.ok(!getListStart("*abc"     /**/));
    assert.ok(!getListStart("-"        /**/));
    assert.ok(!getListStart("-abc"     /**/));
  });
  // line beginning + [zero or more spaces + 1 greater than sign](one-or-more) + 1 or more spaces
  test("getBlockQuote", () =>{
      
    assert.ok(getBlockQuote("> "      /**/));
    assert.ok(getBlockQuote(">> "     /**/));
    assert.ok(getBlockQuote(">>> "    /**/));
    assert.ok(getBlockQuote(" >"      /**/));
    assert.ok(getBlockQuote(" >>"     /**/));
    assert.ok(getBlockQuote(" >>>"    /**/));
    assert.ok(getBlockQuote(" > "     /**/));
    assert.ok(getBlockQuote(" > > "   /**/));
    assert.ok(getBlockQuote(" > > >"  /**/));
    assert.ok(getBlockQuote(" >  x"   /**/));   //multiple spaces....bad but still treat as blockquote for now
    assert.ok(getBlockQuote(" >  > "  /**/));   //multiple spaces....bad but still treat as blockquote for now
    assert.ok(getBlockQuote(" >  >  >"/**/));   //multiple spaces....bad but still treat as blockquote for now
  });
  test("lineTooLong", () => {
    assert.strictEqual(lineTooLong('', 1), false);
    assert.strictEqual(lineTooLong('', 0), false);
    assert.strictEqual(lineTooLong('x', 1), false);
    assert.strictEqual(lineTooLong('x', 0), true);
  });
  test("getReflowedText_compare_before_and_after", () => {
    let debugg = false;
    // debugg = true;
    const fileSuffix = debugg ? "Debug" : "";

    const filePathBefor = path.resolve(__dirname, '../../src/test', `befor${fileSuffix}.md`);
    const filePathAfter = path.resolve(__dirname, '../../src/test', `after${fileSuffix}.md`);
    let linesBefor = fs.readFileSync(filePathBefor, { encoding: 'utf8' }).split(/\r\n|\n/);
    let linesAfter = fs.readFileSync(filePathAfter, { encoding: 'utf8' }).split(/\r\n|\n/);

    if (linesBefor.length === 0 && linesAfter.length === 0) {
      //nothing to test...before and after are equal
      return;
    } else {
      //otherwise both must have at least 1 line
      assert.ok(linesBefor.length > 0);
      assert.ok(linesAfter.length > 0);
    }

    let settings: Settings = getSettings();
    let updateSettings = (settingsLine: string) => {
      let modifications = JSON.parse(settingsLine.replace(/`/g, ""));
      settings.preferredLineLength         /**/ = modifications.settings.preferredLineLength         /**/ === undefined ? settings.preferredLineLength         /**/ : modifications.settings.preferredLineLength;         
      settings.doubleSpaceBetweenSentences /**/ = modifications.settings.doubleSpaceBetweenSentences /**/ === undefined ? settings.doubleSpaceBetweenSentences /**/ : modifications.settings.doubleSpaceBetweenSentences;
      settings.resizeHeaderDashLines       /**/ = modifications.settings.resizeHeaderDashLines       /**/ === undefined ? settings.resizeHeaderDashLines       /**/ : modifications.settings.resizeHeaderDashLines;
      settings.wrapLongLinks               /**/ = modifications.settings.wrapLongLinks               /**/ === undefined ? settings.wrapLongLinks               /**/ : modifications.settings.wrapLongLinks;
    };

    let nextAfterLineToTest = 0;
    let nextBeforLineToTest = 0;

    while (nextBeforLineToTest < linesBefor.length)
    {
      if (debugg) {
        console.log("--------------------------------------------------------------");                   
        console.log(`nextBeforLineToTest  : ${nextBeforLineToTest}`);
      }
      
      let mockTextLine = new MockTextLine(linesBefor, nextBeforLineToTest);

      // change the settings if we hit one of these lines...
      if (mockTextLine.text.startsWith("`{\"settings\":")) {
        updateSettings(mockTextLine.text.replace(/`/g, ""));
      }
      
      if (debugg) {
        console.log('settings:            : ' + JSON.stringify(settings));
      }

      let o = new OtherInfo();
      let s = getStartLine(mockTextLine.lineAtFunc, mockTextLine);
      let e = getEndLine(mockTextLine.lineAtFunc, mockTextLine, linesBefor.length - 1, o); //max line NUMBER is line COUNT minus 1
      o.indents = getLineIndent(s.firstNonWhitespaceCharacterIndex, s.text);
  
      let sei: StartEndInfo = {
        lineStart: s.lineNumber,
        lineEnd: e.lineNumber,
        otherInfo: o
      };

      if (debugg) {
        console.log(`sei                  : ${JSON.stringify(sei)}`);
      }

      let text = linesBefor.slice(sei.lineStart, sei.lineEnd + 1).join("\r\n");
      let reflowedText = getReflowedText(sei, text, settings);

      // now take the reflowed text, split it on the LF delimeters, and loop and compare with the lines after 
      let reflowedLines = reflowedText.split(/\n/);

      if (debugg) {
        console.log(`reflowedLines.length : ${reflowedLines.length}`);
      }

      for (let i = 0; i < reflowedLines.length; i++)
      {
        if (debugg) {
          let iStr = "0".repeat(4 - i.toString().length) + i.toString();
          let nStr = "0".repeat(4 - nextAfterLineToTest.toString().length) + nextAfterLineToTest.toString();
          console.log(`nextAfterLineToTest  : ${nextAfterLineToTest}`);
          console.log(`reflowedLines[${iStr}]+x: ${reflowedLines[i]}x`);
          console.log(`linesAfter[${nStr}]+x   : ${linesAfter[nextAfterLineToTest]}x`);
        }

        assert.equal(linesAfter[nextAfterLineToTest] !== undefined, true, "befor.md has more lines than expected...are there trailing CRLFs?");

        assert.equal(reflowedLines[i], linesAfter[nextAfterLineToTest], "LINES DON'T MATCH!");
        nextAfterLineToTest++;
      }

      nextBeforLineToTest = sei.lineEnd + 1;
    }

    if (debugg) {
      console.log("--------------------------------------------------------------");
    }

    assert.equal(linesAfter.length, nextAfterLineToTest, "after.md has more lines than expected...are there trailing CRLFs?");
  });
});



// takes an array of lines and an index and turns it into a mock vscode text line
class MockTextLine implements vscode.TextLine {

  constructor(private lines: string[], private lineNum: number) {

  }

  lineAtFunc = (line: number): vscode.TextLine => {
      if (line < 0 || line > this.lines.length - 1) {
          throw(new Error("rut row!"));
      }

      return new MockTextLine(this.lines, line);
  };
   /**
   * The zero-based line number.
   *
   * @readonly
   */
  get lineNumber(): number { return this.lineNum; }

  /**
   * The text of this line without the line separator characters.
   *
   * @readonly
   */
  get text(): string { return  this.lines[this.lineNumber]; }
   

  /**
   * The range this line covers without the line separator characters.
   *
   * @readonly
   */
  get range(): vscode.Range { return { } as vscode.Range; }

  /**
   * The range this line covers with the line separator characters.
   *
   * @readonly
   */
  get rangeIncludingLineBreak(): vscode.Range { return {} as vscode.Range; }

  /**
   * The offset of the first character which is not a whitespace character as defined
   * by `/\s/`. **Note** that if a line is all whitespaces the length of the line is returned.
   *
   * @readonly
   */
  get firstNonWhitespaceCharacterIndex(): number { 
      let firstNonWhitespaceCharacterMatch = this.text.match(/\S/);
      if (firstNonWhitespaceCharacterMatch) {
          return this.text.indexOf(firstNonWhitespaceCharacterMatch[0]);
      } else {
          return this.text.length;
      }
  }

  /**
   * Whether this line is whitespace only, shorthand
   * for [TextLine.firstNonWhitespaceCharacterIndex](#TextLine.firstNonWhitespaceCharacterIndex) === [TextLine.text.length](#TextLine.text).
   *
   * @readonly
   */
  get isEmptyOrWhitespace(): boolean {
      return this.firstNonWhitespaceCharacterIndex === this.text.length;
  }

};

