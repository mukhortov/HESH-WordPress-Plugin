# Frequently Asked Questions 


## Does it work with Gutenberg? 

__Yes!__ _Partially..._ Since version 2.3.0, it works with the Gutenberg _Code Editor_, but only the _Code Editor_, not the _Visual Editor_. Press `Ctrl+Shift+Alt+M` / `Cmd+Shift+Alt+M` to switch between the _Visual Editor_ and the _Code Editor_.

It __does not__ work with blocks in the Gutenberg _Visual Editor_. This means it __does not__ highlight code in:
* The _Edit as HTML_ section of every block
* The _Custom HTML_ block
* The _Shortcode_ block

It may work with other code related parts of Gutenberg in the future. [Track the progress here.](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/72)


## How do I get the Classic Editor back!?

Since WordPress version 5.0, Gutenberg is the default editor. If you want this plugin to work the way it used to, you'll have to download the [Classic Editor plugin](https://wordpress.org/plugins/classic-editor/).


## Can I search and replace?

Yes. `Ctrl+F` / `Cmd+F` opens the search panel, which also replaces.

__Function: WINDOWS / MAC__
__Search and replace:__     `Ctrl+F` / `Cmd+F`
__Find next:__              `Ctrl+G` / `Cmd+G` or `F3`
__Find previous:__          `Shift+Ctrl+G` / `Shift+Cmd+G` or `Shift+F3`
__Select next occurrence:__ `Ctrl+D` / `Cmd+D`
__Jump to line:__           `Ctrl+Alt+G` / `Cmd+Opt+G`


## What happened to highlighting in the Theme & Plugin editors?

Since version 3.0 the Theme & Plugin file editors use WordPress's own code editor, which has syntax highlighting and checks your code for errors. Switch it on or off with _Syntax Highlighting_ in your profile.


## Why are p and br tags are being removed?

Wordpress has a feature called the _['auto p'](https://codex.wordpress.org/Function_Reference/wpautop)_ filter which:

>"Changes double line-breaks in the text into HTML paragraphs."

For example, _auto p_ will take some standard post content like this:

```
Some long text
that has many lines.

And paragraphs in it.
```

and turn it into something like this:

```
<p>Some long text<br/>
that has many lines</p>
<p>And paragraphs in it.</p>
```

Like your little brother, it thinks it’s helping, even if it isn’t.

__What can I do about it?__
* __Disable auto p:__ There are several plugins you can use to disable _auto p_ in the _Classic Editor_. I’d recommend [Toggle wpautop](https://wordpress.org/plugins/toggle-wpautop/).
* __Show the p tags:__ The plugin [TinyMCE Advanced](https://wordpress.org/plugins/tinymce-advanced/) has an _Advanced Option_ to _'Keep paragraph tags'_. This option will still add the _"auto p"_ tags but won't strip them out of the visible code.

You can read more about this issues this may cause in this [support thread](https://wordpress.org/support/topic/tags-being-stripped-in-classic-block-content-after-wp-upgrade/).


## Why is my code is being reformatting when I switch to the Visual Editor and back?

The WordPress _Visual Editor_ needs to reformat code in order to function correctly. This is not something that this plugin can fix. __You can disable the Visual Editor entirely__ by going to: _Users_ > _Your Profile_ > _Visual Editor: check 'Disable the visual editor when writing'_.

## Scrollbars are not appearing! / Scroll position is not reset! / Code window is not resizable!

You may have the _'Enable full-height editor and distraction-free functionality'_ turned on. This is a native WordPress feature that changes the scrolling and fullscreen behavior of both the _Code Editor_ and _Visual Editor_.

__To Disable Full-height Editor:__ Go to _'Screen Options'_ (in the top right of the editor page), then uncheck _'Enable full-height editor and distraction-free functionality'_ in the _Additional Settings_ section.


## How do I use Fullscreen?

In the Classic editor's Text tab, the fullscreen button at the right of the toolbar, or `F11`, makes the editor fill the window. `Esc` closes it (with Vim key bindings, use the button or `F11`).

With _'Enable full-height editor and distraction-free functionality'_ on (in _'Screen Options'_ at the top right of the editor page), use WordPress's own distraction-free button instead.


## Which browsers does it work with?

Current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.
