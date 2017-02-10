/**
 * @name     HTML Editor Syntax Highlighter
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
 * @author   James Bradford
 * @link     http://arniebradfo.com/
 * @since    1.7.2
*/

console.log(heshOptions); // from wordpress php

(function (
	document,
	window,
	CodeMirror,
	switchEditors,
	$
) {
	'use strict';

	var editor;
	var scrollPanel;
	var settingsPanel = document.getElementById('CodeMirror-settings');
	var themeOrPluginEditorPage = document.getElementById('newcontent') != null;
	var isActive = false;
	var target = document.getElementById('content') || document.getElementById('newcontent');
	var tab_html = document.getElementById('content-html');
	var tab_tmce = document.getElementById('content-tmce');
	var visualEditorActive = document.getElementsByClassName('tmce-active')[0] != null;
	var visualEditorEnabled = document.getElementById('content-tmce') != null;
	var publishButton = document.getElementById('save-post') || document.getElementById('publish');
	var fontSize = +heshOptions.fontSize;
	var lineHeight = +heshOptions.lineHeight;

	var options = {
		mode: 'wordpresspost',
		tabMode: 'indent',
		theme: heshOptions.theme,
		lineNumbers: !!heshOptions.lineNumbers,
		matchBrackets: true,
		indentUnit: 1,
		tabSize: +heshOptions.tabSize,
		indentWithTabs: true,
		enterMode: 'keep',
		lineWrapping: !!heshOptions.lineWrapping,
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

	function attachSettings() {
		editor.getWrapperElement().appendChild(settingsPanel);
		settingsPanel.style.display = 'block';
		settingsPanel.querySelector('.CodeMirror-settings__toggle').addEventListener('click', toggleSettings);

		// attach all the inputs to live update
		settingsPanel.querySelectorAll('.CodeMirror-settings__option').forEach(function(option) {
			option.addEventListener('change', submitForm);
		})
		settingsPanel.querySelector('#theme').addEventListener('change', updateOption)
		settingsPanel.querySelector('#tabSize').addEventListener('change', updateOption)
		settingsPanel.querySelector('#lineWrapping').addEventListener('change', updateOption)
		settingsPanel.querySelector('#lineNumbers').addEventListener('change', updateOption)

		settingsPanel.querySelector('#fontSize').addEventListener('change', updateFontSize)
		settingsPanel.querySelector('#lineHeight').addEventListener('change', updateLineHeight)
	}
	
	function toggleSettings(event) {
		// TODO: review browser support for toggle
		settingsPanel.classList.toggle('open');
		settingsPanel.classList.toggle('closed');
	}
	function updateOption(event) {
		var value = +event.target.value;
		value = isNaN(value) ? event.target.value : value ;
		if (event.target.checked != null) value = event.target.checked;
		editor.setOption(event.target.id, value);
	}

	function setFontSizeAndLineHeight() {
		scrollPanel.style.fontSize = fontSize + 'px';
		scrollPanel.style.lineHeight = lineHeight + 'em';
		editor.refresh();
	}
	function updateFontSize(event) {
		fontSize = event.target.value;
		scrollPanel.style.fontSize = fontSize + 'px';
		editor.refresh();
	}
	function updateLineHeight(event) {
		lineHeight = event.target.value;
		scrollPanel.style.lineHeight = lineHeight + 'em';
		editor.refresh();
	}


	function attachResize() {
		function matchTextAreaHeight() {
			editor.getWrapperElement().style.height = editor.getTextArea().style.height
		}
		document.getElementById('content-resize-handle').addEventListener('mousedown', function () {
			document.addEventListener('mousemove', matchTextAreaHeight);
		});
		document.addEventListener('mouseup', function () {
			document.removeEventListener('mousemove', matchTextAreaHeight);
		});

		matchTextAreaHeight();

	}

	function startEditor() {

		if (themeOrPluginEditorPage){
			var fileType = document.querySelector('.fileedit-sub h2 span').innerHTML
				.match(/\.[^\)\.]*\)[^\)]*$/ig)[0]
				.match(/[a-z]*/ig)[1];
			console.log(fileType);
			options.mode = fileType;
		}

		editor = CodeMirror.fromTextArea(target, options);
		scrollPanel = editor.getWrapperElement().querySelector('.CodeMirror-code');

		// Save changes to the textarea on the fly
		editor.on('change', function () {
			editor.save();
		});

		// Check if any edits were made to the textarea.value
		window.setInterval(function () {
			if (editor.doc.getValue().length !== editor.getTextArea().value.length) {
				editor.doc.setValue(editor.getTextArea().value);
			}
		}, 50);
	}

	function toVisual() {
		if (isActive) {
			if (switchEditors.switchto) switchEditors.switchto(this);
			editor.toTextArea();
			tab_html.onclick = toHTML;
			isActive = false;
		}
	}

	function toHTML() {
		if (!isActive) {
			if (switchEditors.switchto) switchEditors.switchto(this);
			window.setTimeout(runEditor, 0);
			tab_tmce.onclick = toVisual;
		}
	}

	function runEditor() {
		startEditor();
		if (!themeOrPluginEditorPage) attachResize();
		attachSettings();
		setFontSizeAndLineHeight();
		isActive = true;
	}

	function submitForm() {
		var formArray = $('#CodeMirror-settings__form').serializeArray();
		// TODO: drop jQuery dependency
		// console.log(formArray);
		$.post(heshOptions.ajaxUrl, formArray, function (response) {
			console.log('submitted success');
		});
	}

	function initialise() {
		if (themeOrPluginEditorPage){
			runEditor();
		} else if (visualEditorEnabled && visualEditorActive) {
			tab_html.onclick = toHTML;
		} else {
			runEditor();
			if (visualEditorEnabled) tab_tmce.onclick = toVisual;
			else document.body.className += ' visual-editor-is-disabled';
		}
	}

	if (document.readyState !== 'complete') {
		if (window.addEventListener) window.addEventListener('load', initialise, false);
		else if (window.attachEvent) window.attachEvent('onload', initialise);
	} else {
		initialise();
	}
})(
	document,
	window,
	window.CodeMirror,
	window.switchEditors,
	window.jQuery
	);
