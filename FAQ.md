# Frequently Asked Questions 


## Does it work with Gutenberg? 

__Yes!__ _Partially..._ Since version 2.3.0, it works with the Gutenberg _Code Editor_, but only the _Code Editor_, not the _Visual Editor_. Press `Ctrl+Shift+Alt+M` / `Cmd+Shift+Alt+M` to switch between the _Visual Editor_ and the _Code Editor_.

It __does not__ work with blocks in the Gutenberg _Visual Editor_. This means it __does not__ highlight code in:
* The _Edit as HTML_ section of every block
* The _Custom HTML_ block
* The _Shortcode_ block
See the last screenshot for a visual example.

It may work with other code related parts of Gutenberg in the future. [Track the progress here.](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/72)


## How do I get the Classic Editor back!?

Since WordPress version 5.0, Gutenberg is the default editor. If you want this plugin to work the way it used to, you'll have to download the [Classic Editor plugin](https://wordpress.org/plugins/classic-editor/).


## Can I search and replace? 

__Function: WINDOWS / MAC__
__Start searching:__   `Ctrl-F` / `Cmd-F`
__Find next:__         `Ctrl-G` / `Cmd-G`
__Find previous:__     `Shift-Ctrl-G` / `Shift-Cmd-G`
__Replace:__           `Shift-Ctrl-F` / `Cmd-Opt-F`
__Replace all:__       `Shift-Ctrl-R` / `Shift-Cmd-Opt-F`
__Persistent search:__ `Alt-F` (dialog doesn't auto-close, `Enter` to find next, `Shift-Enter` to find previous)
__Jump to line:__      `Alt-G` 


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

The fullscreen button on the top right of the editor will do one of two things depending on the _'Enable full-height editor and distraction-free functionality'_ setting in your _'Screen Options'_ (in the top right of the editor page):
* __Full-height Editor _Enabled_:__ Toggles the _'distraction free mode'_.
* __Full-height Editor _Disabled_:__ Toggles the _'fullscreen mode'_.

__Keybindings:__ `F11` will toggle fullscreen on and off, and `esc` will close fullscreen.


## Does it work with Internet Explorer? 

__Not really...__ It is partially supported in IE 11. Known bugs are tracked [here](https://github.com/mukhortov/HESH-WordPress-Plugin/issues/41), but won't be fixed. Anything less that IE 10 isn't even supported by Microsoft anymore. If you are using Internet Explorer you should get a [better browser](https://www.mozilla.org/en-US/firefox/new/).

