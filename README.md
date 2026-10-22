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
Releases are built from `master`. Don't edit the `release` branch or the WordPress.org SVN repository by hand: the release script keeps both in step with `master`.

**1. Prepare the version**, in a pull request like any other change:
- Test it (see [Testing locally](#testing-locally)).
- Bump the version everywhere: `Version:` and `HESH_VERSION` in `src/html-editor-syntax-highlighter.php`, `Stable tag:` in `src/readme.txt`, and `version` in `package.json`.
- Add a `= X.Y.Z =` entry to the changelog in `src/readme.txt`, and a `## X.Y.Z` entry to `ChangeLog.md` (it becomes the GitHub release notes).
- Update _Tested up to_ in `src/readme.txt`, and _Requires at least_ / _Requires PHP_ in both `src/readme.txt` and the plugin header if they change.

**2. Merge it.** The [Release workflow](.github/workflows/release.yml) runs on every push to `master` and releases when the version in the plugin header hasn't been released yet:
- **GitHub:** commits the build to the `release` branch ("updating to vX.Y.Z"), tags `vX.Y.Z` and creates the GitHub release.
- **WordPress.org:** commits the build to SVN `trunk` and `tags/X.Y.Z`, plus any changed banners, icons and screenshots from `assets/`.

Pushes that don't change the version release nothing. To release to only one place, or to preview a release, use **Actions → Release → Run workflow** (dry run is on by default).

One-time setup: add your WordPress.org username and SVN password as repository secrets. Generate the SVN password on your WordPress.org profile under **Account & Security → SVN credentials**. Each command asks for the value:

```bash
gh secret set SVN_USERNAME
```

```bash
gh secret set SVN_PASSWORD
```

**Or release from your computer** with the same script the workflow uses. Check out an up-to-date `master` first:

```bash
scripts/release.sh
```

- `scripts/release.sh github` or `scripts/release.sh wordpress` releases to only one place.
- It checks the version numbers and changelog, builds the plugin, shows what it will publish and asks you to confirm.
- For WordPress.org it asks for your username and then your SVN password.
- `--dry-run` shows what would be published without publishing; `--assets` also uploads changed banners, icons and screenshots; `--help` lists every option.
- Needs Node.js, the [GitHub CLI](https://cli.github.com/) (logged in) for GitHub, and Subversion 1.10 or later for WordPress.org.
- A place that already has the version is skipped, so after a failure you can run it again.

**3. After the release**
- Close the GitHub issues it fixes with a comment like _Fixed in [vX.Y.Z](https://github.com/mukhortov/HESH-WordPress-Plugin/releases/tag/vX.Y.Z)!_
- Check that the [plugin page](https://wordpress.org/plugins/html-editor-syntax-highlighter/) shows the new version (usually within a few minutes).
- Over the next 1-2 weeks, watch the [plugin support page](https://wordpress.org/support/plugin/html-editor-syntax-highlighter) for bug reports.

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
