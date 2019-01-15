# TODOs
- default editor heights
- gutenberg mediaquery css
- write about gutenberg in the FAQ
- add instructions to download the old editor
- update supported number

- support gutenberg
	- html block
	- shortcode backwards compat
	- gutenberg block comment + json

- fewer but better themes
- beautify dist css and js that are uncompressed?

- new media
	- logo
	- description
	- screenshots
	- add to FAQ
		- about spell-check
		- search & replace
		- Reporting Bugs

## Later...
- update layout on 1-2 column switch
- load in visual 2col, switch to text, settings is in wrong place
- drop jQuery dependency, needed now for form switch
- create release automation
- user tracking?
	- give opt out checkbox?

    
## Testing
- test new features
- browsers
    - Safari - seems ok
    - FireFox (Mac) - seems ok
    - Chrome (Mac) - seems ok
    - FireFox (Win10) - seems ok
    - Chrome (Win10) - seems ok
    - Edge - seems ok
    - IE 11 - Support dropped. Don't test

## CD from wordpress
`cd wp-content/plugins/HESH-WordPress-Plugin/`


## Useful Links
- process user settings
	- [working with user metadata](https://developer.wordpress.org/plugins/users/working-with-user-metadata/)
	- [update_user_meta()](https://codex.wordpress.org/Function_Reference/update_user_meta)
- AJAX forms
	- [submitting a form in wordpress using ajax](https://teamtreehouse.com/community/submitting-a-form-in-wordpress-using-ajax)
	- [how to handle form submission](http://wordpress.stackexchange.com/questions/60758/how-to-handle-form-submission)
- [wp usage stats](https://wordpress.org/about/stats/)
- [Assets Info](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/)
- [WP SVN](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)
- [WP Gutenberg handbook](https://wordpress.org/gutenberg/handbook/)


# Support Gutenberg:
A proper implementation might require a different program altogether. Many of the features that create complexity in the current hesh.js(e.g. inserting media, buttons that wrap text in `<em>` tags, etc.) do not exist in Gutenberg, and the startup/stop/saving methods will have to be done using Gutenberg EsNext/React/Js/whatever. Learning the [Gutenberg API](https://wordpress.org/gutenberg/handbook/) will take time. It is new, incomplete, and not yet well documented. I believe a similar implementation is possible, but I'm not sure when I'll have time to work on it...
## Features:
- __Gutenberg Code Editor (with just the current highligher)__
	- Listen for switch between Visual Editor and Code Editor to start up.: There is currently no easy/quick way to listen for these button presses because they have no exclusive identifiers.
	- For the same reason, there is no easy way to save the codemirror state back to the textarea input and thus save the work.
	- The _"correct"_ switching implementation would be from extending the Gutenberg API and listen for some [event or hook](https://wordpress.org/gutenberg/handbook/extensibility/extending-editor/) to start and to stop/save.
	- Scrolling will have to work differently. The current textarea scrolls contains the full height of all the text. Codemirror can do this too, but a lack of virtualization causes poor performance, and additional features(search for example) require the editor edges to be present at all times.
	- Maybe just submit a [Gutenberg](https://github.com/WordPress/gutenberg) pull request instead of extension/plugin?
	- If it requires redoing large amounts of work, maybe just start over using VS Code's [Monaco Editor](https://microsoft.github.io/monaco-editor/) instead? It is 1000% better. WP Code?
- __Gutenberg Code Editor syntax parser of block-comment+json__
	- [gutenberg HTML comment syntax](https://wordpress.org/gutenberg/handbook/language/#the-anatomy-of-a-serialized-block)
	- highlight xml-like start and stops tags of HTML comments.
	- highlight json as attributes inside tags.
	- `<!-- wp:namespace/tag-name {"json":"attributes"} --> content <!-- /wp:namespace/tag-name -->`
	- `<!-- wp:singletag /-->`
- __Shortcode block editing with highlighting__
	- [Extend](https://wordpress.org/gutenberg/handbook/extensibility/extending-blocks/) the current shortcode block.
	- Use the current HTML+shortcode highlighter.
- __Highlighting 'Edit as HTML' feature of all blocks__
	- WP Gutenberg might be planning to implement this natively. TODO: search for an [issue](https://github.com/WordPress/gutenberg/issues).
- __HTML block already works__
	- This one uses Emmet and its already GREAT!
	- [Extend](https://wordpress.org/gutenberg/handbook/extensibility/extending-blocks/) the current HTML block to follow the same settings and make everything consistent.