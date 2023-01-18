<p align="center">
    <img width="256" src="https://raw.githubusercontent.com/mukhortov/HESH-WordPress-Plugin/master/assets/icon.svg?sanitize=true" alt="<W/>">
</p>

# HTML Editor Syntax Highlighter

Add syntax highlighting in the Classic Post & Page HTML text editor, Gutenberg Code Editor, and Theme & Plugin editors using [Codemirror.js](http://codemirror.net/)

## Status: Unmaintained
I don't use wordpress anymore and don't have the time to maintain this code. It still appears to work with the most recent version of wordpress (v6.1). I you would like to contribute, send [me](https://github.com/arniebradfo) a message.

### v3 WPcode
There was a v3 in the works that uses the Monaco code editor rather than CodeMirror. Its on [github as WPcode](https://github.com/arniebradfo/wp-code), but I don't have time for that either.

---

## Features

* Syntax highlighting in the Post/Page HTML editor
* _NEW:_ Syntax highlighting in the Gutenberg _Code Editor_ (not _Visual Editor_)
* Syntax highlighting in the Theme & Plugin editors
* Syntax highlighting for WordPress `[shortcodes/]`
* Save your posts and pages pressing `Ctrl+S` (`Cmd+S` on Mac)
* Restore cursor position after page is reloaded
* Huge selection of themes and other customization options
* Fullscreen mode: toggle with `F11`/`Esc` hotkeys

If you are not a developer, please use the [HTML Editor Syntax Highlighter plugin page](http://wordpress.org/plugins/html-editor-syntax-highlighter/) on WordPress.org to download and install it. You can also download the latest release from [here](https://github.com/mukhortov/HESH-WordPress-Plugin/releases).

## Please Provide Your Feedback
If you're a regular user of this plugin, please consider taking a short [User Experience Survey](https://goo.gl/forms/xvaHgd7sZEbBbFAL2) to provide feedback that will help shape the new version 3.0.


## Contributing

Please report any issues or suggestions.

### Building
1. Clone the repo.
2. Install [node.js](https://nodejs.org/) if you haven't already.
3. Install the [gulp](http://gulpjs.com/) CLI globally if you haven't already with `npm install -g gulp-cli`.
4. Run `npm install` on the project folder.
5. Run `gulp build` to build the project.

Running `gulp` will build the project and run it in a watch state. Making any changes to files will automatically rebuild the project. Install the [LiveReload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) chrome browser extension and the page will reload when the project rebuilds.

### Release Process
Don't manually edit the `release` branch. Only merge `master` into the `release` branch to update it
- Test it. (TODO: add a general test process)
- Switch to `master` branch
- Add a description of the release in `readme.txt` & `ChangeLog.md`
- Update all version numbers including the _Stable Tag_
- Update WP _Tested up to:_ in `readme.txt`
- Recompile with `gulp package`
- Commit with the version number in the commit note: `compiling to vX.X.X`
- In the parallel `release` branch dist folder
- Commit onto `release` with the version number in the commit note: `updating to vX.X.X`.
- Push everything to github
- Test it one final time
- Create a new github release at [Code > Releases > Draft New](https://github.com/mukhortov/HESH-WordPress-Plugin/releases/new): `vX.X.X @ Target:release`, Add relevant release notes from `ChangeLog.md`
- Close the github issues related to the release with a comment linking to the release page: _Fixed in [vX.X.X](https://github.com/mukhortov/HESH-WordPress-Plugin/releases/tag/vX.X.X)!_
- [Publish to the WP Plugin Repo through SVN](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/#editing-existing-files):
    - Clone the svn repo if you haven't already: `svn co https://plugins.svn.wordpress.org/html-editor-syntax-highlighter/`
	- Copy and paste the new version files from the git repo to the SVN repo `/trunk` (TODO: better way?)
	- Run `svn stat` and/or `svn diff` on the SVN repo and make sure the changes look correct
	- Run `svn ci -m "committing version X.X.X to trunk"`
	- Run `svn cp trunk tags/X.X.X` to make a tagged copy in the tags folder
	- Run `svn ci -m "tagging version X.X.X"` and release the new version to the world
	- Check to make sure WP updates the plugin
	- Cheers! have a drink
- Over the next 1-2weeks, watch the [plugin support page](https://wordpress.org/support/plugin/html-editor-syntax-highlighter) to see if there are major bugs or if everyone hates something

## Sample Text for testing
Paste this code in the editor to test out all the different syntax highlighting features.

```HTML
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

<!--more WordPress More Tag Text --><!--noteaser--><!--nextpage-->
<!--HTML comment--><!--[shortcode]-->

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

<input onclick=" document.getElementById('identifier').style.width = '200px'; "/>
<script>
	// javascript comment
	var obj = {
		key: value,
		keytwo: valuetwo,
		array: ['valueone', 'valuetwo'] // square brackets in javascript block
	};
	document.getElementById('identifier').style.width = '200px';
	var string = '</script' + '>'; // writing this straight out will break the mix
</script>

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
```

For promotional text:

```HTML
<h1>HTML Editor Syntax Highlighter</h1>
	
<p class="description">
	Add syntax highlighting to the Classic Text Editor, Gutenberg Code Editor, and Theme &amp; Plugin Editors. It also highlights [[shortcodes]] like HTML!
	[shortcode attribute="value" standAloneAttribute bool=true int=42 /]
</p>

<div>
	[shortcode ]
		[oneliner html='<label class="name">Label</label>']
		shortcode content 
		<a href="#">nested html</a>
		[[escapedshortcode]]
	[/shortcode]
</div>

<!--more WordPress More Tag Text --><!--noteaser--><!--nextpage-->
<!-- HTML comment --><!-- commented out [shortcode] -->

<p>It works with inline CSS!</p>
<style> /* css comment */
	#identifier, .class, element[attribute="value"] {
		width:  200px;
		color:  rebeccapurple;
	}
</style>

<p>It works with inline JavaScript Too!</p>
<script> // javascript comment
	var obj = {
		key: value,
		number: 200,
		array: ['valueone', 'valuetwo'] 
	};
	document.getElementById('identifier').style.width = obj.number + 'px';
</script>

```
