=== HTML Editor Syntax Highlighter ===
Contributors: nixdns, arniebradfo, rraub, collinprice
Donate link: https://www.paypal.me/mukhortov/5
Tags: syntax highlighter, codemirror, text editor, code highlighter, code coloring, editor, html editor, gutenberg, code editor, theme editor, plugin editor, syntax, highlighting, highlighter, syntax highlighting, codemirror.js, code, 
Requires at least: 4.0
Tested up to: 5.8.1
Stable tag: 2.4.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Add syntax highlighting to WordPress code editors using CodeMirror.js

== Description ==

Add syntax highlighting in the Classic Post & Page HTML text editor, Gutenberg Code Editor, and Theme & Plugin editors using CodeMirror.js

= Features =

* Syntax highlighting in the Post/Page HTML editor
* _NEW:_ Syntax highlighting in the Gutenberg _Code Editor_ (not _Visual Editor_)
* Syntax highlighting in the Theme & Plugin editors
* Syntax highlighting for WordPress `[shortcodes/]`
* Save your posts and pages pressing `Ctrl+S` (`Cmd+S` on Mac)
* Restore cursor position after page is reloaded
* Huge selection of themes and other customization options
* Fullscreen mode: toggle with `F11`/`Esc` hotkeys

If you would like to contribute to this plugin, view the [github repo](https://github.com/mukhortov/HESH-WordPress-Plugin).

If you're a regular user of this plugin, please consider taking a short [User Experience Survey](https://goo.gl/forms/xvaHgd7sZEbBbFAL2) to provide feedback that will help shape the new version 3.0.


== Frequently Asked Questions ==


= Does it work with Gutenberg? =

__Yes!__ _Partially..._ Since version 2.3.0, it works with the Gutenberg _Code Editor_, but only the _Code Editor_, not the _Visual Editor_. Press `Ctrl+Shift+Alt+M` / `Cmd+Shift+Alt+M` to switch between the _Visual Editor_ and the _Code Editor_.

It __does not__ work with blocks in the Gutenberg _Visual Editor_. This means it __does not__ highlight code in:
* The _Edit as HTML_ section of every block
* The _Custom HTML_ block
* The _Shortcode_ block
See the last screenshot for a visual example.

It may work with other code related parts of Gutenberg in the future. [Track the progress here.](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/72)


= How do I get the Classic Editor back!? =

Since WordPress version 5.0, Gutenberg is the default editor. If you want this plugin to work the way it used to, you'll have to download the [Classic Editor plugin](https://wordpress.org/plugins/classic-editor/).


= Can I search and replace? =

__Function: WINDOWS / MAC__
__Start searching:__   `Ctrl-F` / `Cmd-F`
__Find next:__         `Ctrl-G` / `Cmd-G`
__Find previous:__     `Shift-Ctrl-G` / `Shift-Cmd-G`
__Replace:__           `Shift-Ctrl-F` / `Cmd-Opt-F`
__Replace all:__       `Shift-Ctrl-R` / `Shift-Cmd-Opt-F`
__Persistent search:__ `Alt-F` (dialog doesn't auto-close, `Enter` to find next, `Shift-Enter` to find previous)
__Jump to line:__      `Alt-G` 


= Why are p and br tags are being removed? =

Wordpress has a feature called the _['auto p'](https://codex.wordpress.org/Function_Reference/wpautop)_ filter which:

> "Changes double line-breaks in the text into HTML paragraphs."

For example, _auto p_ will take some standard post content like this:

`
Some long text
that has many lines.

And paragraphs in it.
`

and turn it into something like this:

`
<p>Some long text<br/>
that has many lines</p>
<p>And paragraphs in it.</p>
`

Like your little brother, it thinks it’s helping, even if it isn’t.

__What can I do about it?__
* __Disable auto p:__ There are several plugins you can use to disable _auto p_ in the _Classic Editor_. I’d recommend [Toggle wpautop](https://wordpress.org/plugins/toggle-wpautop/).
* __Show the p tags:__ The plugin [TinyMCE Advanced](https://wordpress.org/plugins/tinymce-advanced/) has an _Advanced Option_ to _'Keep paragraph tags'_. This option will still add the _"auto p"_ tags but won't strip them out of the visible code.

You can read more about this issues this may cause in this [support thread](https://wordpress.org/support/topic/tags-being-stripped-in-classic-block-content-after-wp-upgrade/).


= Why is my code is being reformatting when I switch to the Visual Editor and back? =

The WordPress _Visual Editor_ needs to reformat code in order to function correctly. This is not something that this plugin can fix. __You can disable the Visual Editor entirely__ by going to: _Users_ > _Your Profile_ > _Visual Editor: check 'Disable the visual editor when writing'_.

= Scrollbars are not appearing! / Scroll position is not reset! / Code window is not resizable!

You may have the _'Enable full-height editor and distraction-free functionality'_ turned on. This is a native WordPress feature that changes the scrolling and fullscreen behavior of both the _Code Editor_ and _Visual Editor_.

__To Disable Full-height Editor:__ Go to _'Screen Options'_ (in the top right of the editor page), then uncheck _'Enable full-height editor and distraction-free functionality'_ in the _Additional Settings_ section.


= How do I use Fullscreen? =

The fullscreen button on the top right of the editor will do one of two things depending on the _'Enable full-height editor and distraction-free functionality'_ setting in your _'Screen Options'_ (in the top right of the editor page):
* __Full-height Editor _Enabled_:__ Toggles the _'distraction free mode'_.
* __Full-height Editor _Disabled_:__ Toggles the _'fullscreen mode'_.

__Keybindings:__ `F11` will toggle fullscreen on and off, and `esc` will close fullscreen.


= Does it work with Internet Explorer? =

__Not really...__ It is partially supported in IE 11. Known bugs are tracked [here](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/41), but won't be fixed. Anything less that IE 10 isn't even supported by Microsoft anymore. If you are using Internet Explorer you should get a [better browser](https://www.mozilla.org/en-US/firefox/new/).



== Changelog ==

= 2.4.4 =
* Added about 15 new themes

= 2.4.3 =
* Updated css for wordpress v5.8

= 2.4.2 =
* removing survey notice

= 2.4.1 =
* fixed bug: notification would not dismiss if the visual editor was open
* fix bug: Setting Form can now submit from memory, not just when the dom is in the page.

= 2.4.0 =
* updating a major number so I can review downloads more accurately.
* reorganized the codebase
* Reverting the name-change of `hesh.php`
This name-change of `html-editor-syntax-highlighter.php` to `hesh.php` caused the plugin to deactivate itself because the php file was missing. Reverting the name-change of `hesh.php` will cause this all over again, but hey.

= 2.3.5 =
* remove Github Updater headers
* testing WP update Process

= 2.3.4 =
* fixing typo `$this->$surveyLink` to `$this->surveyLink`

= 2.3.3 =
* Updated Release process
* Fix bug: #80 Only activate on pages where the editor will run
* Added UX survey notice.

= 2.3.2 =
* added a seventh screenshot
* removed [`smartIndent`](https://codemirror.net/doc/manual.html#option_smartIndent) because its annoying
* fixed gulp watch task
* updated FAQ

= 2.3.1 =
* Fixing JS error in issue #81 _(Hopefully?)_
* Updating authorship so James can get a job. Will revert to Petr Later...

= 2.3.0 =
* Support for Gutenberg Code Editor!
* Added new themes: Codepen and Wordpress (which is now the default).
* Created new screenshots for the plugin page.
* New Logo based on `<W/>`.
* Updated FAQ with Gutenberg info.
* Changed build steps to only export one `.css` and `.js` file

= 2.2.6 =
* added Gutenberg information after the update to WordPress version 5.0

= 2.2.5 =
* fixed bug: #75 removing `f` typo

= 2.2.4 =
* fixed bug: Allow Multiple Instances of CodeMirror on a page #71
* fixed bug: js error when custom post type does not support 'editor' feature #62

= 2.2.3 =
* A patch for WP 4.9. No more double editors in theme/plugin editors.

= 2.2.2 =
* fixed bug: github updater in production issue #52
* updated Codemirror to latest release version

= 2.2.1 = 
* fixed bug: editor was not stopping when switching between visual editor and text editor

= 2.2.0 = 
* added search & replace with dialog
* added highlighting options
* added auto-close tags and brackets option
* added code-folding option
* added scrollbars option
* added keyMap options
* added _Default_ and _None_ themes
* fixed bug: made tab management agnostic to tab count and names - #50

= 2.1.0 = 
* added search
* add highlighting for `<!--nextpage-->`
* fixed bug: Theme and Plugin Editor not working

= 2.0.1 =
* fixed bug: esc key weirdness
* fixed bug: don't steal editor focus from title on _'Add New Post'_
* fixed bug: scrollbar appears in middle of text editor
* fixed bug: toolbar can be too big

= 2.0.0 =
* now adjusts to the _'Enable full-height editor and distraction-free functionality'_ setting
* syntax highlighting on Theme and Plugin Editor pages
* fixed bug: native wp editor buttons work on content - no longer overwrites with emulating buttons
* __Settings:__
	* added an extendable settings panel
	* saves settings to WordPress user profile
	* added more text customization settings
* basically rewrote the whole codebase

= 1.7.2 =
* fixed bug: pre v5.4 php was causing an error - `func_that_returns_array()['index']` syntax is [not allowed](http://php.net/manual/en/language.types.array.php#example-105)
* fixed bug: CodeMirror not initializing properly when new user tries to edit post for the first time
* fixed bug: CodeMirror no longer trying to load on "All Posts" and "All Pages"
* fixed bug: Font and theme were reset to default when switching to the visual editor and back

= 1.7.1 =
* fixed bug: return key would create two new lines and ignore indent
* fixed bug: wp native "Add Media" button was not working
* added version string to .css and .js resources for cache-busting purposes

= 1.7.0 =
* Ctrl-S / Cmd-S saving will now select "Save Draft" if the post has not been published yet
* Switched to an [npm](https://www.npmjs.com/) and [grunt.js](http://gruntjs.com/) based build so new versions of CodeMirror can be applied easier
* Updated CodeMirror to its latest version
* Fixed FireFox bug: `<select>` drop-down would not display due to `::active` state `transform` property
* Fixed bug: toolbar covering text at small screen width
* Fixed bug: `switchEditors is undefined`
* Updated Css for wp 4.5
* Added all available CodeMirror themes
* Added syntax highlighting:
	- for WordPress shortcodes
	- for `<!--more-->` tags and their variants
	- _NEW_ CodeMirror modes: `shortcode.js` & `wordpresspost.js`
* Now calling `hesh.js` in an anonymous wrapper so it won't pollute the global namespace
* Now initializing `hesh.js` in an async compliant way
* Refactored php to enqueue javascript in the WordPress friendly way
* Tested with WordPress 4.5.2
* Tested in all modern desktop browsers on OSX and Windows 10

= 1.6.9 =
* Fixed issues with switching editor modes in WP 4.3

= 1.6.7 =
* Added paragraph tag button, it's visible only when the visual editor is disabled
* Added minimum editor window height for the full-height mode

= 1.6.6 =
* Added minimum editor window height for the full-height mode

= 1.6.5 =
* Fixes for full-height mode
* Fixed the issue with a hidden first line on smaller screens

= 1.6.4 =
* Fixed the issue with a hidden first line on smaller screens

= 1.6.3 =
* Fixed editor window height and resize handler
* "headers already sent" issue

= 1.6.2 =
* Compatibility with WP 4.0
* Fixed fullscreen mode

= 1.6.0 =
* You can change font size in the editor
* Fixed issue with restoring cursor position
* Updated CodeMirror library
* Some minor improvements

= 1.5.0 =
* Updated CodeMirror library
* Some minor improvements

= 1.4.8 =
* Add Link button now works with page selector window
* Some minor improvements

= 1.4.7 =
* You can now select Light or Dark editor colour theme

= 1.4.6 =
* Fixed issue when "Add Media" button stopped working
* Fixed editor resize bug in Visual mode.

= 1.4.5 =
* Bug fixing

= 1.4.4 =
* Add Media button now works correctly in Text mode
* Fixed jumping cursor issue when ‘:’, '{', '}' keys are pressed

= 1.4.3 =
* Fixed jumping cursor issue when ‘/’ key is pressed.

= 1.4.2 =
* Fixed a focus bug

= 1.4.1 =
* Toggle fullscreen mode with F11/Esc hotkeys
* Publish Post/Page hotkeys Ctrl + S / Cmd + S
* Fixed some bugs for IE 8
* Added development files to the zip bundle

= 1.4.0 =
* New fullscreen mode
* Remembers tab state
* Editor resize handler
* Code refactoring and minification for better loading performance

= 1.3.2 =
* Updated CodeMirror library
* Increased loading performance
* Match brackets

= 1.3.0 =
* CodeMirror library updated to version 3.02
* Added quick-tags toolbar buttons
* Preserve the scroll position after update or page reload

= 1.2.1 =
* vertical resize for the editing box (works on FireFox, Chrome, Safari).
* not working buttons/tags was hidden

= 1.2 =
Bug fix:
* plugin does not work in new post/page.

= 1.1 =
Bug fix (thanks to collinprice):
* when user has the visual editor disabled this plugin does not show up.

= 1.0 =
Initial release.


== Screenshots ==
1. Syntax highlighting in the Classic Post/Page HTML editor.
2. Quick Settings Panel.
3. Advanced Settings Panel.
4. Syntax highlighting in the Theme/Plugin editor.
5. Example code highlighting.
