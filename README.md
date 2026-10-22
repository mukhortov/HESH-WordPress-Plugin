<p align="center">
    <img width="256" src="https://raw.githubusercontent.com/mukhortov/HESH-WordPress-Plugin/master/assets/icon.svg?sanitize=true" alt="<W/>">
</p>

# HTML Editor Syntax Highlighter

Adds syntax highlighting to the WordPress code editors using [CodeMirror](https://codemirror.net/5/): the Classic editor's Text (Code) tab, the block editor's _Code Editor_, and the Theme & Plugin file editors.

## Status

Maintained by [Peter Mukhortov](https://github.com/mukhortov). Version 2.5.0 supports WordPress 6.5 to 7.1 and PHP 7.4 or later.

The plugin was created by Peter Mukhortov and James Bradford ([@arniebradfo](https://github.com/arniebradfo)). James no longer works on the plugin, so please send questions, bug reports and pull requests to [this repository](https://github.com/mukhortov/HESH-WordPress-Plugin/issues) rather than to him.

### Roadmap
- **2.5.x**: compatibility and security fixes for current WordPress, on the existing CodeMirror 5 code.
- **3.0**: a rewrite in TypeScript on CodeMirror 6, built with `@wordpress/scripts` and covered by automated tests.

An earlier v3 experiment based on the Monaco editor ([WPcode](https://github.com/arniebradfo/wp-code)) is no longer being developed.

---

## Features

* Syntax highlighting in the Classic editor's Text (Code) tab for posts and pages
* Syntax highlighting in the block editor's _Code Editor_ (not the _Visual Editor_)
* Syntax highlighting in the Theme & Plugin file editors
* Syntax highlighting for WordPress `[shortcodes/]`
* Save your post with `Ctrl+S` (`Cmd+S` on Mac)
* Restores the cursor position after the page reloads
* A large selection of themes and other customization options
* Fullscreen mode in the Classic editor: toggle with `F11`/`Esc`

## Installation

If you are not a developer, install the plugin from **Plugins → Add New Plugin** in WordPress, or from its [page on WordPress.org](https://wordpress.org/plugins/html-editor-syntax-highlighter/). Releases are also published on [GitHub](https://github.com/mukhortov/HESH-WordPress-Plugin/releases).

Requires WordPress 6.5 or later and PHP 7.4 or later.

## Contributing

Report bugs and suggestions in [GitHub issues](https://github.com/mukhortov/HESH-WordPress-Plugin/issues). Pull requests are welcome.

### Building
1. Clone the repo.
2. Install [Node.js](https://nodejs.org/).
3. Run `npm install` in the project folder.
4. Run `npm run build` to build the plugin. It writes to `../HESH-WordPress-Plugin-dist` by default; set `HESH_DIST=/some/path` to build somewhere else.

`npm start` builds the plugin and rebuilds it on every change. With the [LiveReload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) browser extension, the page reloads after each rebuild.

Gulp runs from the project's own dependencies, so you don't need a global `gulp-cli`; `npx gulp <task>` works too.

### Testing locally
[WordPress Playground](https://wordpress.org/playground/) runs WordPress with only Node.js, no PHP or Docker needed. After building, start a site with the built plugin installed and activated, already logged in as admin:

```bash
npx @wp-playground/cli@latest start --path=../HESH-WordPress-Plugin-dist --wp=6.5 --php=7.4 --reset
```

Change `--wp` and `--php` to test other versions (`--wp=latest` for the current release), and keep `--reset` so the site is rebuilt with them. Check the versions under **Tools → Site Health → Info**.

Before a release, check:
- the block editor's _Code Editor_ (switching modes, saving, undo), the Classic editor's Text (Code) tab (with the [Classic Editor](https://wordpress.org/plugins/classic-editor/) plugin), and the Theme & Plugin file editors;
- the oldest and the newest supported WordPress versions;
- [Plugin Check](https://wordpress.org/plugins/plugin-check/) (**Tools → Plugin Check**, all categories), which should report no errors.

### Release Process
Don't manually edit the `release` branch. Only merge `master` into the `release` branch to update it
- Test it (see [Testing locally](#testing-locally))
- Switch to `master` branch
- Add a description of the release in `readme.txt` & `ChangeLog.md`
- Update all version numbers: `Version:` and `HESH_VERSION` in `html-editor-syntax-highlighter.php`, `Stable tag:` in `readme.txt`, and `version` in `package.json`
- Update WP _Tested up to:_ in `readme.txt`, and _Requires at least_ / _Requires PHP_ in both `readme.txt` and the plugin header if they change
- Recompile with `npm run package`
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
- Over the next 1-2 weeks, watch the [plugin support page](https://wordpress.org/support/plugin/html-editor-syntax-highlighter) to see if there are major bugs or if everyone hates something

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
