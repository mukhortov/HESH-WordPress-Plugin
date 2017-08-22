# HTML Editor Syntax Highlighter

WordPress plugin that adds syntax highlighting in the Post & Page HTML text editor and the Theme & Plugin editors using [Codemirror.js](http://codemirror.net/)

## Features

* Syntax highlighting in the Post/Page HTML editor
* _NEW:_ Syntax highlighting in the Theme & Plugin editors
* Syntax highlighting for WordPress shortcodes
* Save your posts and pages pressing `Ctrl+S` (`Cmd+S` on Mac)
* Restore cursor position after page is reloaded
* Huge Selection of themes and other customization options
* Fullscreen mode: toggle with F11/Esc hotkeys

If you are not a developer, please use the [HTML Editor Syntax Highlighter plugin page](http://wordpress.org/plugins/html-editor-syntax-highlighter/) on WordPress.org to download and install it. You can also download the latest release from [here](https://github.com/mukhortov/HESH-WordPress-Plugin/releases).

## Contributing

Please report any issues or suggestions.

### Building
1. Clone the repo.
2. Install [node.js](https://nodejs.org/) if you haven't already.
3. Install the [gulp](http://gulpjs.com/) CLI globally if you havent already with `npm install -g gulp-cli`.
4. Run `npm install` on the project folder.
5. Run `gulp build` to build the project.

Running `gulp` will build the project and run it in a watch state. Making any changes to files will automatically rebuild the project. Install the [LiveReload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) chrome browser extension and the page will reload when the project rebuilds.

### Releasing
Don't manually edit the release branch. Only merge master into the release branch to update it.

## Sample Text for testing

Paste this code in the editor to test out all the different syntax highlighting features.

```
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

	a really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really really long line that should wrap and indent properly


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
```