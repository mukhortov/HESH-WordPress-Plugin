=== HTML Editor Syntax Highlighter ===
Contributors: nixdns, arniebradfo, rraub, collinprice
Donate link: https://www.paypal.me/mukhortov/5
Tags: syntax highlighter, codemirror, text editor, code highlighter, code coloring, editor, html editor, theme editor, plugin editor, syntax, highlighting, highlighter, syntax highlighting, codemirror.js, code,
Requires at least: 4.0.15
Tested up to: 4.9.1
Stable tag: 2.2.3
License: GPL-2.0
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Add syntax highlighting to the all WordPress code editors using Codemirror.js

== Description ==

Add syntax highlighting in the WordPress Post & Page HTML text editor and the Theme & Plugin editors using Codemirror.js

= Features =

* Syntax highlighting in the Post/Page HTML editor
* _NEW:_ Syntax highlighting in the Theme & Plugin editors
* Syntax highlighting for WordPress shortcodes
* Save your posts and pages pressing `Ctrl+S` (`Cmd+S` on Mac)
* Restore cursor position after page is reloaded
* Huge Selection of themes and other customization options
* Fullscreen mode: toggle with F11/Esc hotkeys

If you would like to contribute to this plugin, view the [github repo](https://github.com/mukhortov/HESH-WordPress-Plugin).

== Frequently Asked Questions ==

= Does it work with Internet Explorer? =
Not really... It is partially supported in IE 11. Known bugs are tracked [here](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/41), but won't be fixed. Anything less that IE 10 isn't even supported by Microsoft anymore. If you are using Internet Explorer you should get a [better browser](https://www.mozilla.org/en-US/firefox/new/).

= How do I use Fullscreen? =
The fullscreen button on the top right of the editor will do one of two things depending on the _"Enable full-height editor and distraction-free functionality"_ setting in your _"Screen Options"_ (in the top right of the editor page):
* On: Toggles the "distraction free mode".
* Off: Toggles the "fullscreen mode".

= Can I search? =
Yes! Seach with `Ctrl+F` (`Cmd+F` on Mac). Replace with `Ctrl+alt+F` (`Cmd+alt+F` on Mac).

== Changelog ==

= 2.2.2 =
* fixed bug: github updater in production issue #52
* updated Codemirror to latest release version

= 2.2.1 = 
* fixed bug: editor was not stopping when switching between visual editor and text editor

= 2.2.0 = 
* added search & replace with dialog
* added highlighing options
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
* Fixed FireFox bug: `<select>` dropdown would not display due to `::active` state `transform` property
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
1. Syntax highlighting in the Post/Page HTML editor.
2. Settings Panel.
3. Syntax highlighting in the Theme/Plugin editor.
