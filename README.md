<p align="center">
    <img width="256" src="https://raw.githubusercontent.com/mukhortov/HESH-WordPress-Plugin/master/assets/icon.svg?sanitize=true" alt="<W/>">
</p>

# HTML Editor Syntax Highlighter

Adds syntax highlighting to the WordPress code editors using [CodeMirror 6](https://codemirror.net/): the Classic editor's Text (Code) tab and the block editor's _Code Editor_, with highlighting for WordPress `[shortcodes]`.

## Status

Maintained by [Peter Mukhortov](https://github.com/mukhortov). Version 2.5.0, the current release, supports WordPress 6.5 to 7.1 and PHP 7.4 or later. The `master` branch is version 3.0, in development.

The plugin was created by Peter Mukhortov and James Bradford ([@arniebradfo](https://github.com/arniebradfo)). James no longer works on the plugin, so please send questions, bug reports and pull requests to [this repository](https://github.com/mukhortov/HESH-WordPress-Plugin/issues) rather than to him.

### Roadmap
- **2.5.x**: compatibility and security fixes for current WordPress, on the CodeMirror 5 code in the `release` branch.
- **3.0** (`master`): a rewrite in TypeScript on CodeMirror 6, built with `@wordpress/scripts` and covered by automated tests.
- **3.x**: the _Custom HTML_ and _Shortcode_ blocks, the site editor, autocompletion.

An earlier v3 experiment based on the Monaco editor ([WPcode](https://github.com/arniebradfo/wp-code)) is no longer being developed.

### What changes in 3.0
- CodeMirror 6 replaces CodeMirror 5. Shortcodes are parsed by a small [Lezer](https://lezer.codemirror.net/) grammar, with HTML, CSS and JavaScript parsed around them.
- The Theme & Plugin file editors keep WordPress's built-in code editor, which has linting and follows the profile's syntax highlighting option. 2.x replaced it.
- 13 themes instead of 60. Settings that used a removed theme move to `wordpress` (dark themes) or `default` (light themes).
- _VS Code_ key bindings replace _Sublime Text_. _Vim_ and _Emacs_ are still there. Themes and key bindings load only when used.
- _Match brackets_ also highlights matching HTML tags, so _Match tags_ is gone. CodeMirror 6 uses the browser's scrollbars, so _Show scrollbars_ is gone.
- Settings are stored in one `hesh_settings` user meta, saved through the REST API. The 2.x `hesh_*` user meta moves into it the first time each user opens the editor.

---

## Features

* Syntax highlighting in the Classic editor's Text (Code) tab for posts and pages
* Syntax highlighting in the block editor's _Code Editor_ (not the _Visual Editor_)
* Syntax highlighting for WordPress `[shortcodes]`, `[[escaped]]` shortcodes and `<!--more-->` tags, with closing shortcodes that have no opening tag marked
* Search and replace (`Ctrl+F` / `Cmd+F`), code folding, bracket and tag matching, auto-closing tags and brackets
* Default, VS Code, Vim and Emacs key bindings
* Save your post with `Ctrl+S` (`Cmd+S` on Mac)
* Restores the cursor position after the page reloads
* 13 themes and other settings, saved per user
* Fullscreen mode in the Classic editor: toggle with `F11`/`Esc` (when the full-height editor is off)

## Installation

If you are not a developer, install the plugin from **Plugins → Add New Plugin** in WordPress, or from its [page on WordPress.org](https://wordpress.org/plugins/html-editor-syntax-highlighter/). Releases are also published on [GitHub](https://github.com/mukhortov/HESH-WordPress-Plugin/releases).

Requires WordPress 6.5 or later and PHP 7.4 or later.

## Contributing

Report bugs and suggestions in [GitHub issues](https://github.com/mukhortov/HESH-WordPress-Plugin/issues). Pull requests are welcome.

### Project layout
- `html-editor-syntax-highlighter.php`, `includes/`, `uninstall.php`: the PHP side. `includes/settings-schema.json` is the settings schema, shared by the PHP meta registration and the TypeScript settings.
- `src/lang-shortcode/`: the shortcode grammar (`shortcode.grammar`, compiled with `lezer-generator`), its tokenizer, and the language that mixes it with HTML.
- `src/editor/`: the CodeMirror setup shared by both editors, themes and key bindings.
- `src/block-editor/`, `src/classic-editor/`: the two editor screens.
- `src/settings/`: settings, the settings panel (`@wordpress/components`) and saving.
- `tests/e2e/`: Playwright tests, run against WordPress Playground.

### Building
1. Clone the repo.
2. Install [Node.js](https://nodejs.org/) 22 or later.
3. Run `npm install` in the project folder.
4. Run `npm run build` to compile `src/` into `build/`.

`npm start` rebuilds on every change. `npm run package` builds and copies only the files the plugin ships with into `dist/html-editor-syntax-highlighter`, plus the WordPress.org banners, icons and screenshots in `assets/` (the release script keeps those out of SVN `trunk`). Set `HESH_DIST=/some/path` to package somewhere else. Hidden files in the target folder, like a `.git` folder, are kept.

WordPress packages (`@wordpress/element`, `@wordpress/components`, ...) are not bundled: the build lists them in `build/*.asset.php`, and the plugin loads them from WordPress.

### Testing
- `npm test`: type check (`tsc --noEmit`, strict) and unit tests (Vitest), including the shortcode parser on the [sample text](#sample-text-for-testing) below.
- `npm run lint`: ESLint and Stylelint with the WordPress rules.
- `npm run test:e2e`: Playwright tests of the block editor and the Classic editor, on WordPress 6.5 with PHP 7.4 and on the latest WordPress with PHP 8.3. Run `npm run package` first. The first run downloads WordPress; install the browser once with `npx playwright install chromium`. `HESH_E2E_SITES=6.5 npm run test:e2e` runs one site.

The end-to-end tests start [WordPress Playground](https://wordpress.org/playground/) sites with `tests/e2e/server.mjs`, which needs only Node.js: no PHP or Docker. `tests/e2e/mu-plugins/hesh-e2e.php` logs the admin in, switches pages to the Classic editor and adds a few test-only REST routes.

### Testing locally
After `npm run package`, start a site with the plugin installed and activated, already logged in as admin:

```bash
npm run playground
```

That runs `wp-playground-cli start --path=dist/html-editor-syntax-highlighter --wp=6.5 --php=7.4 --reset`. Run it with other `--wp` and `--php` versions (`--wp=latest` for the current release), and keep `--reset` so the site is rebuilt with them. Check the versions under **Tools → Site Health → Info**. Playground keeps the site in `~/.wordpress-playground/sites`.

Before a release, check:
- the block editor's _Code Editor_ (switching modes, saving, undo, settings) and the Classic editor's Text (Code) tab (with the [Classic Editor](https://wordpress.org/plugins/classic-editor/) plugin: Quicktags buttons, Add Media, the Visual tab);
- the oldest and the newest supported WordPress versions;
- [Plugin Check](https://wordpress.org/plugins/plugin-check/) (**Tools → Plugin Check**, all categories), which should report no errors. CI runs it on every pull request.

### Release Process
Releases are built from `master`. Don't edit the `release` branch or the WordPress.org SVN repository by hand: the release script keeps both in step with `master`.

**1. Prepare the version**, in a pull request like any other change:
- Test it (see [Testing](#testing) and [Testing locally](#testing-locally)).
- Bump the version everywhere: `Version:` and `HESH_VERSION` in `html-editor-syntax-highlighter.php`, `Stable tag:` in `readme.txt`, and `version` in `package.json`. Between releases `master` carries a development version like `3.0.0-dev`, which never releases.
- Add a `= X.Y.Z =` entry to the changelog in `readme.txt`, and a `## X.Y.Z` entry to `ChangeLog.md` (it becomes the GitHub release notes).
- Update _Tested up to_ in `readme.txt`, and _Requires at least_ / _Requires PHP_ in both `readme.txt` and the plugin header if they change.

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
