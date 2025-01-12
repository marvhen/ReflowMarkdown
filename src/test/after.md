`{"settings": {"preferredLineLength":80, "doubleSpaceBetweenSentences": true, "resizeHeaderDashLines": true, "wrapLongLinks":"wrap"}}`

This markdown file is used by the getReflowedText_compare_before_and_after unit
test.  The test reads the *befor.md* file and iteratively performs a reflow
operation on all lines it finds and compares each result to the corresponding
lines in the *after.md* file.  The very first line in this file is a special
*settings* line that specifies the ReflowMarkdown extension settings via an
inline code block of JSON.  Similar lines occur further down in the file and
when each is encountered the specified settings are merged in and used for
reflowing until another *settings* line is encountered.  As changes to the code
are made, this method of testing will tell us if we have made any changes that
cause the before and after paragraphs to no longer match.

This is a Header Made Using Equals Signs
========================================

`{"settings": {"preferredLineLength":30 }}`

This is a Longer Header Made
Using Equals Signs Which Wraps
At 30 Characters
==============================

`{"settings": {"preferredLineLength":70 }}`

This is a Header Made With Dashes And It is Exactly 70 Characters Long
----------------------------------------------------------------------

1. This is the first item in a list.
2. This is the second item in a list and it is much longer.  It is so
   long that it extends beyond the preferredLineLength.

   > This is a blockquote paragraph that extends beyond the
   > preferredLineLength of 70 characters.  After this blockqote is
   > reflowed, each line should not be longer than 70 characters and
   > each line should have the same indent and nesting level as what
   > it had before the reflow.
   > > This is a nested blockquote which means it is a blockqote
   > > inside of another blockquote.  Nested blockquotes are handled
   > > too by the reflowMarkdown extension, but they are considered to
   > > be their own paragraph and therefore require their own reflow
   > > action.

3. This is the third item in a list and it contains multiparagraph
   blockquotes.

   > This is a big blockquote with multiple paragraphs inside of it.
   > Some lines may be longer than the preferredLineLength, while
   > others aren't.
   > 
   > The multiple paragraphs are not separated by an empty line, but
   > by an empty blockquote line, which is a line with the blockquote
   > start character (`>`) followed only by zero or more spaces.
   > 
   > > This is a nested blockquote with no empty line between it and
   > > the previous blockquote. It should be reflowed as a separate
   > > paragraph as well. Its formatting should also be fixed so that
   > > the blockquote characters are alinged properly.
   > > 
   > > The level 2 blockquote also has two paragraphs in it, which are
   > > separated by an empty level 2 blockquote line. It should be
   > > reflowed as two separate paragraphs as well.

`{"settings": {"doubleSpaceBetweenSentences":false }}`

This is a paragraph with several sentences. It starts out with two or
more spaces between each sentence. When it is reflowed, we expect
there to only be one space between the sentences! Does it work with
questions too? My response to that is "yes it does." The github user
[rbolsius](https://github.com/rbolsius)
[recommended this feature](https://github.com/marvhen/ReflowMarkdown/pull/1)
and I said "awesome!" You may ask "does it work when a sentence ends
like this?" Yes, it does.However, if you forget to put at least one
space between sentences like this, it does not know that that you
wanted a new sentence to start, so it will not add any spacing for
you.

[This line ends is a very long link/url and it does not get reflowed to the next line](http://some-long-url.blah.blah?q=abcdefghijklmnopqrstuvwxyz)

This
[line ends with a very long link/url and it reflows to the next line but then it doesn't wrap anymore after that.](http://some-long-url.blah.blah?q=abcdefghijklmnopqrstuvwxyz)

`{"settings": {"wrapLongLinks":"doNotWrap" }}`

This [line ends with a very long link/url and it does not reflow to the next line because we have wrapLongLinks set to doNotWrap](http://some-long-url.blah.blah?q=abcdefghijklmnopqrstuvwxyz)