/**
 * @name     HTML Editor Syntax Highlighter
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
 * @author   James Bradford
 * @link     http://arniebradfo.com/
 * @since    1.7.2
*/

(function (
	document,
	window,
	CodeMirror,
	wpLink,
	switchEditors
) {
	'use strict';

	function heshPlugin () {
		var editor;
		var isOn = false;
		var buttonsAdded = false;
		var target = document.getElementById('content');
		var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
		var tab_html = document.getElementById('content-html');
		var tab_tmce = document.getElementById('content-tmce');
		var visualEditorActive = document.getElementById('wp-content-wrap').className.indexOf('tmce-active') > -1;
		var visualEditorEnabled = document.getElementById('content-tmce') != null;
		var toolbar = document.getElementById('ed_toolbar');
		var fullscreenBox = document.getElementById('wp-content-editor-container');
		var fullscreenClass = 'heshFullscreen';
		var publishButton = document.getElementById('save-post') != null ? document.getElementById('save-post') : document.getElementById('publish');

		var options = {
			mode: 'wordpresspost',
			tabMode: 'indent',
			theme: 'material',
			lineNumbers: true,
			matchBrackets: true,
			indentUnit: 4,
			indentWithTabs: true,
			enterMode: 'keep',
			lineWrapping: true,
			autofocus: true,
			styleActiveLine: true,
			electricChars: false,
			extraKeys: {
				'F11': function () {
					// toggleFullscreen();
				},
				'Esc': function () {
					// toggleFullscreen();
				},
				'Ctrl-S': function () {
					publishButton.click();
				},
				'Cmd-S': function () {
					publishButton.click();
				}
			}
		};

		var matchTextAreaHeight = function () {
			editor.getWrapperElement().style.height = editor.getTextArea().style.height
		}

		var runEditor = function () {
			editor = CodeMirror.fromTextArea(target, options);

			// Save changes to the textarea on the fly
			editor.on('change', function () {
				editor.save();
			});

			// Check if any edits were made to the textarea.value
			window.setInterval(function() {
				if (editor.doc.getValue().length !== editor.getTextArea().value.length) {
					editor.doc.setValue(editor.getTextArea().value);
				}
			}, 50);

			document.getElementById('content-resize-handle').addEventListener('mousedown', function () {
				document.addEventListener('mousemove', matchTextAreaHeight);
			});
			document.addEventListener('mouseup', function () {
				document.removeEventListener('mousemove', matchTextAreaHeight);
			});

			matchTextAreaHeight();
			isOn = true;
		};


		var toVisual = function () {
			if (isOn) {
				if (switchEditors.switchto) switchEditors.switchto(this);
				editor.toTextArea();
				tab_html.onclick = toHTML;
				isOn = false;
			}
		};

		var toHTML = function () {
			if (!isOn) {
				if (switchEditors.switchto) switchEditors.switchto(this);
				window.setTimeout(runEditor, 0);
				tab_tmce.onclick = toVisual;
			}
		};

		// Initialise //
		if (visualEditorEnabled && visualEditorActive) {
			tab_html.onclick = toHTML;
		} else {
			runEditor();
			if (visualEditorEnabled) {
				tab_tmce.onclick = toVisual;
			} else {
				document.body.className += ' visual-editor-is-disabled';
			}
		}
	}

	if (document.readyState !== 'complete') {
		if (window.addEventListener) window.addEventListener('load', heshPlugin, false);
		else if (window.attachEvent) window.attachEvent('onload', heshPlugin);
	} else {
		heshPlugin();
	}
})(
	document, 
	window, 
	window.CodeMirror, 
	window.wpLink,
	window.switchEditors
);
