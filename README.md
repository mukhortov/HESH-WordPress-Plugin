#TODOs
- re-add window fullscreen
- add content resizer
- fix button code placement bug
- build dist branch

- build module loader?
  - in php
  - on the fly in js


#HTML Editor Syntax Highlighter

WordPress plugin that adds syntax highlighting in the WordPress Post & Page HTML/text editor using Codemirror.js


##Features

* Syntax highlighting in the Post/Page HTML editor
* _NEW:_ Syntax highlighting for WordPress shortcodes
* Save your posts and pages pressing Ctrl+S (Cmd+S on Mac)
* Restore cursor position after page is reloaded
* _NEW:_ Huge Selection of themes
* Fullscreen mode: toggle with F11/Esc hotkeys

If you are not a developer, please use the [HTML Editor Syntax Highlighter plugin page](http://wordpress.org/plugins/html-editor-syntax-highlighter/) on WordPress.org to download and install it.


## Contributing

Please report any issues or suggestions.
- settings icon by Oksana Latysheva from [the noun project](https://thenounproject.com/)


##Changelog

###1.7.2
* fixed bug: pre v5.4 php was causing an error - `func_that_returns_array()['index']` syntax is [not allowed](http://php.net/manual/en/language.types.array.php#example-105)
* fixed bug: CodeMirror not initializing properly when new user tries to edit post for the first time
* fixed bug: CodeMirror no longer trying to load on "All Posts" and "All Pages"
* fixed bug: Font and theme were reset to default when switching to the visual editor and back

###1.7.1
* fixed bug: return key would create two new lines and ignore indent
* fixed bug: wp native "Add Media" button was not working
* added version string to .css and .js resources for cache-busting purposes

###1.7.0
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

###1.6.9
* Fixed issues with switching editor modes in WP 4.3

###1.6.7
* Added paragraph tag button, it's visible only when the visual editor is disabled
* Added minimum editor window height for the full-height mode

###1.6.6
* Added minimum editor window height for the full-height mode

###1.6.5
* Fixes for full-height mode
* Fixed the issue with a hidden first line on smaller screens

###1.6.4
* Fixed the issue with a hidden first line on smaller screens

###1.6.3
* Fixed editor window height and resize handler
* "headers already sent" issue

###1.6.2
* Compatibility with WP 4.0
* Fixed fullscreen mode

###1.6.0
* You can change font size in the editor
* Fixed issue with restoring cursor position
* Updated CodeMirror library
* Some minor improvements

###1.5.0
* Updated CodeMirror library
* Some minor improvements

###1.4.8
* Add Link button now works with page selector window
* Some minor improvements

###1.4.7
* You can now select Light or Dark editor color theme

###1.4.6
* Fixed issue when "Add Media" button stopped working
* Fixed editor resize bug in Visual mode.

###1.4.5
* Bug fixing

###1.4.4
* Add Media button now works correctly in Text mode
* Fixed jumping cursor issue when ‘:’, '{', '}' keys are pressed

###1.4.3
* Fixed jumping cursor issue when ‘/’ key is pressed.

###1.4.2
* Fixed a focus bug

###1.4.1
* Toggle fullscreen mode with F11/Esc hotkeys
* Publish Post/Page hotkeys Ctrl + S / Cmd + S
* Fixed some bugs for IE 8
* Added development files to the zip bundle

###1.4.0
* New fullscreen mode
* Remembers tab state
* Editor resize handler
* Code refactoring and minification for better loading performance

###1.3.2
* Updated CodeMirror library
* Increased loading performance
* Match brackets

###1.3.0
* CodeMirror library updated to version 3.02
* Added quick-tags toolbar buttons
* Preserve the scroll position after update or page reload

###1.2.1
* vertical resize for the editing box (works on FireFox, Chrome, Safari).
* not working buttons/tags was hidden

###1.2
Bug fix:
* plugin does not work in new post/page.

###1.1
Bug fix (thanks to collinprice):
* when user has the visual editor disabled this plugin does not show up.

###1.0
Initial release.


##TODOs:
* [add non-minified js and css?](https://wordpress.org/support/topic/add-non-minfied-javascript-and-css-files)
* [don't reformat on editor switch](https://wordpress.org/support/topic/loses-schemaorg-data)
	- incorporate the process of that other plugin
	- give a checkbox option to turn it on and off
* [spellcheck](https://wordpress.org/support/topic/trying-to-enable-spell-check-inside-the-editor)
* add image previews
* more options
	- indenting: size and tabs/spaces
	- wordwrap
	- save scroll position in addition to cursor position
* themes that match the current WordPess admin theme
* support for adding content from the "Add Media" button
* use WordPess native buttons for adding html tags
* read [bugs](https://wordpress.org/support/plugin/html-editor-syntax-highlighter) and add more TODOs

##Sample Text for testing
`
<div>
	[shortcode attribute="value" standAloneAttribute bool=true int=42 ]
		[oneliner noquotes=stringvaluewithnospaces]
		[self-closing-syntax html='<label class="name">Label</label>' /]
		shortcode content 
		<a href="#">nested html</a>
		[[escapedshortcode]]
		[ [brackets that-dont-count]]
	[/shortcode]
</div>

<!--more WordPress More Tag Text --><!--noteaser-->
<!--HTML comment--><!--[shortcode]-->

ERRORS!
[/matchlessEndTag]<div class="right after error"></div>
[shortcode no_square_brackets='aa[<div here="whatever" adn=" ></div>]aaa']
[no/special|characters\in*shortcode^names or.attribute`names=error /]

&amp; &#xaA1; &#9; &error
<?php 
	// this is meta highlighting
	[shortcode] 
	<div class="something"></div>
	$var = 'value'; 
?>

<div style=" width:200px; height:400px; ">styled div</div>
<style>
	/* css comment */
	#identifier, .class{
		width:200px;
		height:400px;
	}
	/* square brackets in css block */
	element[attribute="value"]{ color:red; }
</style>

<input onclick=" document.getElementById('identifier').style.width = 200px; "/>
<script>
	// javascript comment
	var obj = {
		key: value,
		keytwo: valuetwo,
		array: ['valueone', 'valuetwo'] // square brackets in javascript block
	};
	document.getElementById('identifier').style.width = 200px;
	var string = '</script' + '>'; // writing this straght out will break the mix
</script>
`