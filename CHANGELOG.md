Change Log
==========

(*[semantic versioning](https://semver.org/) [ambitioned](http://www.dictionary.com/browse/ambitioned)
for releases but not guaranteed...)*

3.1.0
-----

- Added support for multi-paragraph blockquotes, fixing
  [issue #8](https://github.com/marvhen/ReflowMarkdown/issues/8).
  Thank you [Alonso Herreros](https://github.com/alonso-herreros) for
  the code for this!

3.0.0
-----

- This port the old source code to a new fresh extension using the
  latest dependencies and dev tools, which will later allow for some
  updates requested by users.
- No functional changes (hopefully), but now depends on VS Code
  1.96.0.
- Refreshed to now depend on newer versions of dependencies, using
  latest dev dependencies.
- If problems are found with this version, please report them and
  revert to the previous version.

2.1.0
-----

- Added the [reflowMarkdown.wrapLongLinks](README.md#Extension-Settings)
  setting.
- Bumped the minor version number per semver to indicate features were
  added in a backwards-compatible way.

2.0.0
-----

- A lot of changes/refactoring in here so bumping the major version to let
  everyone know there *may* be breakages.  Particularly in regards to links
  reflowing or not reflowing they same as before.  Sorry for the uncertainty
  here.
- Fixed [#2](https://github.com/marvhen/ReflowMarkdown/pull/2)
- Added the [reflowMarkdown.resizeHeaderDashLines](README.md#Extension-Settings)
  setting
- Major refactoring to make the code more testable.
- Created a before/after testing scheme.  The befor.md file contains example
  of markdown prior to being reflowed and the after.md file has the same
  content reflowed.  The *getReflowedText_compare_before_and_after* test does a
  reflow on all the lines in befor.md and compares the result to the lines in
  after.md.  This tells us as changes are made to the code whether we broke
  anything.  Still not sure if this counts as a unit test or if its more of an
  integration test.  It runs under mocha without the need of vscode running
  however so that is a plus.
- Removed the `preserveIndent` setting as there was no logic actually
  implementing any behavior different from when it was set or unset.

1.5.0
-----

- Added the [reflowMarkdown.doubleSpaceBetweenSentences](README.md#Extension-Settings)
  setting to insert two spaces instead of one between sentences.
- Don't split inline code spans onto separate lines.
- Support fenced code blocks surrounded by three back-ticks (` ``` `)
- Don't change the indentation level when reflowing blockquotes.
- Within numbered and bulleted lists, keep the indentation before and the
  number of spaces after a list marker unchanged.

1.4.4
-----

- Correction to .vscodeignore

1.4.3
-----

- The extension as installed from Visual Studio Marketplace is not working for
  some reason. This version is simply publishing it with the updated version
  of vsce to see if that fixes it.

1.4.2
-----

- Fix incorrect regex that looked for spaces embedded within square brackets
  (link text). The search was greedy and therefore was not working when two
  links were on the same line.
- Refactored functions to a separate, unit-testable module.
- Several other changes relating to the package and vscode configuration.

1.4.1
-----

- Logo touchup

1.4.0
-----

- Implemented a suggestion from a user to not include trailing whitepace after
  each line. This is the default configuration of the [markdownlint extension](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint).
  However, if a paragraph starts out ending with 2 spaces, those 2 spaces will
  be preserved.

1.3.0
-----

- Support added for hyperlink text within square brackts to not be broken when
  it occurs at the end of a line. This improves readability of the plain text
  document because it makes long and unfriendly hyperlinks stay at the end of
  lines instead of in the middle where the reader has to skip around them.

1.2.0
-----

- When a line ends with a word that begins with a left square bracket
  ReflowMarkdown will assume it is the beginning of a hyperlink and ignore the
  max length setting so the link text and link url stay at the end of that
  line instead of beginning a new line. This exceptional case will improve
  overall readability because most URLs are very long and verbose and readers
  are mostly concerned with the link text and not the link url. Currently this
  will only work however when the link text is a single word. If the link text
  has spaces in it, it will break at the space and this is something that will
  be fixed in a later release.
- Fix the reflow not working sometimes due to the blockquote logic.

1.0.0
-----

- Initial release after forking from [Reflow paragraph](https://marketplace.visualstudio.com/items?itemName=TroelsDamgaard.reflow-paragraph)
- Support for Markdown lists and blockquotes, including nested blockquotes.
