/**
 * @name     HTML Editor Syntax Highlighter
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
 * @author   James Bradford
 * @link     http://arniebradfo.com/
 * @since    1.7.2
*/

// console.log(window.heshOptions); // from wordpress php

(function (
	document,
	window,
	CodeMirror,
	// switchEditors,
	$,
	heshOptions
) {
	'use strict';


	// var isThemeOrPluginPage = document.getElementById('newcontent') != null; //
	// var isActive = false; //
	// var isVisualEditorActive = document.getElementsByClassName('tmce-active')[0] != null; //
	// var isVisualEditorEnabled = document.getElementById('content-tmce') != null; //


	// ELEMENTS //
	var editor; // CodeMirror
	var scrollPanel;
	var settingsPanel = document.getElementById('CodeMirror-settings');
	var toolbar = document.getElementById('ed_toolbar');
	var target = document.getElementById('content') || document.getElementById('newcontent');
	var tabText = document.getElementById('content-html');
	var tabVisual = document.getElementById('content-tmce');
	var publishButton = document.getElementById('save-post') || document.getElementById('publish');
	var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
	var fullHeightToggle = document.getElementById('editor-expand-toggle');

	var fontSize = +heshOptions.fontSize;
	var lineHeight = +heshOptions.lineHeight;

	var state = {
		isVisualEnabled: document.getElementById('content-tmce') != null,
		isThemeOrPlugin: document.getElementById('newcontent') != null,

		isActive: function() {
			return document.getElementsByClassName('CodeMirror')[0] != null;
		},

		isVisualActive: function() {
			return document.getElementsByClassName('tmce-active')[0] != null;
		},

		isFullHeight: function() {
			if (!fullHeightToggle) return false;
			return fullHeightToggle.checked;
		},

		settingsPosition: function() { // : 'top' | 'middle' | 'bottom' | 'normal'
			if (toolbar.style.position === 'absolute') {
				if (toolbar.style.top === '0px') return 'top';
				else return 'bottom';
			} else if (toolbar.style.position === 'fixed') {
				return 'middle';
			} else {
				return 'normal';
			}
		}

		// isSettingsClosed: true,
		// isSettingsOpen: false,
		// isAdvancedSettingsOpen: false
	};
	var thisIsSafari = (function() {
		// TODO: test for focus change here. indicative of Safari
		return true;
	})();

	function attachFullHeightToggle() {
		if (!fullHeightToggle) return;
		fullHeightToggle.addEventListener('change', fullHeightToggled);
		fullHeightToggled();
	}
	function fullHeightMatch() {
		editor.getTextArea().style.height = editor.getWrapperElement().getBoundingClientRect().height + 'px';
	}

	function setFixedValues() {
		var toolbarRect = toolbar.getBoundingClientRect();
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = 'fixed';
			element.style.top = toolbarRect.bottom + 'px';
			element.style.right = (document.documentElement.getBoundingClientRect().width - toolbarRect.right) + 'px';
			if (!element.id.match(/toggle/ig))	{
				element.style.left = toolbarRect.left + 'px';
				element.style.width = 'auto';
			}
		}
	}
	function removeFixedValues() {
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = '';
			element.style.top = '';
			element.style.left = '';
			element.style.right = '';
			element.style.width = '';
		}
	}

	function setFullHeightMaxHeight() {
		// if (!settingsPanel.classList.contains('open-advanced')) return;
		var theForm = settingsPanel.querySelector('#CodeMirror-settings__form');
		var margin = 6; // arbitrary
		var formTop = theForm.getBoundingClientRect().top;
		var editorBottom = document.getElementById('post-status-info').getBoundingClientRect().top;
		var editorBottomMaxHeight = editorBottom - formTop;
		var screenBottomMaxHeight = window.innerHeight - formTop;
		theForm.style.maxHeight = Math.min(editorBottomMaxHeight, screenBottomMaxHeight) - margin + 'px';
	}
	function removeFullHeightMaxHeight() {
		settingsPanel.querySelector('#CodeMirror-settings__form').style.maxHeight = '';
	}

	var isFixed = false;
	var setFixedNotScheduled = true;
	function fixedSettings() {
		if (setFixedNotScheduled) {
			window.requestAnimationFrame(function(){
				var wasntFixed = !isFixed;
				isFixed = (toolbar && toolbar.style.position === 'fixed');
				if (isFixed && wasntFixed) setFixedValues();
				else if (!isFixed && !wasntFixed) removeFixedValues();
				setFullHeightMaxHeight();
				setFixedNotScheduled = true;
			});
			setFixedNotScheduled = false;
		}
	}

	function fullHeightToggled() {
		if (state.isFullHeight()) {
			editor.setOption('viewportMargin', Infinity); 
			editor.on('change', fullHeightMatch);
			window.addEventListener('scroll', fixedSettings);
			window.addEventListener('resize', fixedSettings);
			window.setTimeout(function(){
				editor.getWrapperElement().style.height = 'auto';
				fullHeightMatch();
				setFullHeightMaxHeight();
				matchTextAreaMarginTop();
			}, 100); // TODO: find a better way to override
		} else {
			editor.setOption('viewportMargin', options.viewportMargin);
			editor.off('change', fullHeightMatch);
			window.removeEventListener('scroll', fixedSettings);
			window.addEventListener('resize', fixedSettings);
			window.setTimeout(function(){
				editor.getWrapperElement().style.marginTop = '';
				removeFullHeightMaxHeight();
				removeFixedValues();
				matchTextAreaHeight();
			}, 100);
		}
		// editor.getTextArea().style.display = 'none'; // just to make sure
	}

	var options = {
		mode: 'wordpresspost',
		tabMode: 'indent',
		matchBrackets: true,
		indentUnit: 1,
		indentWithTabs: true,
		enterMode: 'keep',
		autofocus: true,
		styleActiveLine: true,
		electricChars: false,
		viewportMargin: 10,
		extraKeys: {
			'F11': function () {
				toggleFullscreen();
			},
			'Esc': function () {
				toggleFullscreen();
			},
			'Ctrl-S': function () {
				publishButton.click();
			},
			'Cmd-S': function () {
				publishButton.click();
			}
		}
	};
	function updateOptions() {
		options.theme = heshOptions.theme;
		options.lineNumbers = !!heshOptions.lineNumbers;
		options.tabSize = +heshOptions.tabSize;
		options.lineWrapping = !!heshOptions.lineWrapping;
	}

	function attachSettings() {
		// move the settingsPanel (produced in php) to inside the codemirror instance
		editor.getWrapperElement().appendChild(settingsPanel);
		settingsPanel.style.display = 'block';
		settingsPanel.querySelector('.CodeMirror-settings__toggle').addEventListener('click', toggleSettings);
		settingsPanel.querySelector('.CodeMirror-settings__toggle-advanced').addEventListener('click', toggleSettings);

		// attach all the inputs to live update
		var options = settingsPanel.querySelectorAll('.CodeMirror-settings__option');
		for (var index = 0; index < options.length; index++) {
			var option = options[index];
			option.addEventListener('change', submitForm);
		}
		settingsPanel.querySelector('#theme').addEventListener('change', updateOption);
		settingsPanel.querySelector('#tabSize').addEventListener('change', updateOption);
		settingsPanel.querySelector('#lineWrapping').addEventListener('change', updateOption);
		settingsPanel.querySelector('#lineNumbers').addEventListener('change', updateOption);
		settingsPanel.querySelector('#fontSize').addEventListener('change', updateFontSize);
		settingsPanel.querySelector('#lineHeight').addEventListener('change', updateLineHeight);
	}
	
	// toggle classes for settingsPanel state
	function toggleSettings(event) {
		if (event.target.id.match(/advanced/ig)) {
			if (settingsPanel.classList.contains('open-advanced')) {
				settingsPanel.classList.remove('open-advanced');
				settingsPanel.classList.remove('closed');
				settingsPanel.classList.add('open');
			} else {
				settingsPanel.classList.add('open-advanced');
				settingsPanel.classList.add('open');
				settingsPanel.classList.remove('closed');
			}
		} else {
			if (settingsPanel.classList.contains('open')) {
				settingsPanel.classList.add('closed');
				settingsPanel.classList.remove('open');
				settingsPanel.classList.remove('open-advanced');
			} else {
				settingsPanel.classList.add('open');
				settingsPanel.classList.remove('closed');
				settingsPanel.classList.remove('open-advanced');
			}
		}
	}

	// set a codemirror option from an input.onchange event callback
	function updateOption(event) {
		var value = +event.target.value;
		value = isNaN(value) ? event.target.value : value ;
		if (event.target.checked != null) value = event.target.checked;
		console.log(event.target.id);
		console.log(value);
		console.log(heshOptions);
		heshOptions[event.target.id] = value;
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

	// setup the fullscreen button
	var fullscreenBox = document.getElementById('wp-content-editor-container');
	var fullscreenClass = 'heshFullscreen';
	function attachFullscreen() {
		toolbar.insertAdjacentHTML(
			'afterbegin',
			'<button type="button" id="cm_content_fullscreen" class="ed_button qt-dfw" title="Full Screen"></button>'
		);
		document.getElementById('cm_content_fullscreen').onclick = toggleFullscreen;
	}

	function toggleFullscreen() {
		fullscreenBox.classList.toggle(fullscreenClass); // TODO: fix the use of toggle
		editor.focus();
	}

	// attaches a dragger to the bottom right of the theme/plugin editor to control editor height
	function attachResizeThemeOrPlugin() {
		var editorHeight = 500;
		var minEditorHieght = 200;
		editor.getWrapperElement().style.height = editorHeight + 'px';
		var resizeHandle = document.createElement('div');
		resizeHandle.className = 'hesh-content-resize-handle';
		resizeHandle.id = 'content-resize-handle';
		editor.getWrapperElement().appendChild(resizeHandle);
		var isDragging = false;
		var yStartPosition;
		var newHeight = editorHeight;
		function changeCodemirrorHeight(event) {
			newHeight = editorHeight + (event.pageY - yStartPosition);
			editor.getWrapperElement().style.height = Math.max(minEditorHieght, newHeight) + 'px';
		}
		document.getElementById('content-resize-handle').addEventListener('mousedown', function (event) {
			yStartPosition = event.pageY;
			isDragging = true;
			document.addEventListener('mousemove', changeCodemirrorHeight);
			event.preventDefault();
		});
		document.addEventListener('mouseup', function () {
			isDragging = false;
			editorHeight = Math.max(minEditorHieght, newHeight);
			document.removeEventListener('mousemove', changeCodemirrorHeight);
			editor.refresh();
		});
	}

	function matchTextAreaHeight() {
		editor.getWrapperElement().style.height = editor.getTextArea().style.height;
	}

	function matchTextAreaMarginTop() {
		editor.getWrapperElement().style.marginTop = editor.getTextArea().style.marginTop;
	}

	// copy the resize of the textarea in codemirror
	function attachResizePostOrPage() {
		document.getElementById('content-resize-handle').addEventListener('mousedown', function () {
			document.addEventListener('mousemove', matchTextAreaHeight);
		});
		document.addEventListener('mouseup', function () {
			document.removeEventListener('mousemove', matchTextAreaHeight);
			editor.refresh();
		});
		window.addEventListener('resize', function () { // debounce the resize listner
			if (state.isFullHeight()) matchTextAreaMarginTop();
			// editor.refresh();
		});
		if (!state.isFullHeight()) matchTextAreaHeight();
	}

	function getCookie(name) {
		var value = '; ' + document.cookie;
		var parts = value.split('; ' + name + '=');
		if (parts.length === 2) return parts.pop().split(';').shift();
	}

	// updates the user settings in the wordpress DB
	function submitForm() {
		var formArray = $('#CodeMirror-settings__form').serializeArray();
		// TODO: drop jQuery dependency
		// console.log(formArray); // for debug
		$.post(heshOptions.ajaxUrl, formArray, function (/*response*/) {
			// console.log(response); // for debug
		});
	}

	function setFileType() {
		var fileNameElement = document.querySelector('.fileedit-sub .alignleft');
		var fileType = fileNameElement.textContent
			.match(/\.[a-z\d]{2,}/ig)[0] // find the file extention
			.match(/[a-z]*/ig)[1]; // remove the dot
		var filetypeToMode = { // map file extensions to their CodeMirror modes
			php: 'php',
			css: 'css',
			xml: 'xml',
			html: 'htmlmixed',
			js: 'javascript',
			json: 'javascript'
		};
		options.mode = filetypeToMode[fileType];
	}

	// cursor & selection pairity between codemirror and the textarea
	function syncSelection() {
		// var cursorPosition = editor.doc.getCursor();
		var selection = editor.doc.listSelections()[0];
		var scrollPosition = editor.getScrollInfo();
		var head, anchor, i;
		head = anchor = i = 0;
		// console.log(selection);
		editor.doc.eachLine(function(line){
			if (i > (selection.head.line - 1)) return;
			head += line.text.length + 1; 
			i++;
		});
		head += selection.head.ch;
		i = 0;
		editor.doc.eachLine(function(line){
			if (i > (selection.anchor.line - 1)) return;
			anchor += line.text.length + 1; 
			i++;
		});
		anchor += selection.anchor.ch;
		// console.log(head);
		// console.log(anchor);
		editor.getTextArea().setSelectionRange(anchor, head, anchor > head ? 'forward' : 'backward');
		if (thisIsSafari) editor.focus(); // for safari ?
		if (thisIsSafari) editor.scrollTo(scrollPosition.left, scrollPosition.top); // for safari ?

		// Saving cursor state
		document.cookie = 'hesh_plugin_cursor_position=' + postID + ',' + head.line + ',' + head.ch;
		// TODO: save scroll position and selection state too
	}

	function restoreCursorState() {
		var cursorCookiePosition = (getCookie('hesh_plugin_cursor_position') || '0,0,0').split(',');
		if (postID === cursorCookiePosition[0]) {
			editor.setCursor(+cursorCookiePosition[1], +cursorCookiePosition[2]);
			// TODO: restore scroll position too
		}
	}

	// Check if any edits were made to the textarea.value
	function matchTextArea() {
		var editorLength = editor.doc.getValue().length;
		var textAreaLength = editor.getTextArea().value.length;
		if (editorLength !== textAreaLength) { // if there were changes...

			// save the cursor state
			var cursorPosition = editor.doc.getCursor();
			var scrollPosition = editor.getScrollInfo();

			// update codemirror with the new textarea.value
			editor.doc.setValue(editor.getTextArea().value);
			editor.focus();

			// reset the cursors new state - there may be new lines added
			var line = cursorPosition.line;
			var maxCh = editor.getLineHandle(line).text.length + 1;
			var ch = cursorPosition.ch + (textAreaLength - editorLength);
			while (maxCh < (ch + 1)) {
				line++;
				ch -= maxCh;
				maxCh = editor.getLineHandle(line).text.length + 1;
			}
			editor.doc.setCursor({
				line: line,
				ch: ch
			});
			if (thisIsSafari) editor.scrollTo(scrollPosition.left, scrollPosition.top);

		}
	}
	
	// TODO: combine runEditor and startEditor
	// var checkEditorInterval;
	function startEditor() {
		if (state.isActive()) return;

		updateOptions();

		// change the mode if on the theme/plugin editor page
		if (state.isThemeOrPlugin) setFileType();

		// start up codemirror
		editor = CodeMirror.fromTextArea(target, options);		
		scrollPanel = editor.getWrapperElement().querySelector('.CodeMirror-code');
		target.classList.add('CodeMirror-mirrored');

		toolbar.addEventListener('mousedown', syncSelection);
		toolbar.addEventListener('click', function(){
			window.setTimeout(matchTextArea,0);
		});

		restoreCursorState();

		// Save save all changes to the textarea.value
		editor.on('change', function (instance) { instance.save(); });

		if (state.isThemeOrPlugin) { 
			attachResizeThemeOrPlugin();
		} else {
			attachResizePostOrPage();
			attachFullHeightToggle();
			attachFullscreen();
		}
		attachSettings();
		setFontSizeAndLineHeight();
	}

	function stopEditor() {
		if (!state.isActive()) return;
		editor.toTextArea();
	}

	function initialise() {
		if (state.isThemeOrPlugin) {
			startEditor();
		} else if (state.isVisualEnabled) {
			tabText.addEventListener('click', function(){
				window.setTimeout(startEditor, 0);
			});
			tabVisual.addEventListener('click', stopEditor);
			if (!state.isVisualActive()) startEditor();
		} else {
			startEditor();
			document.body.className += ' visual-editor-is-disabled';
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
	// window.switchEditors,
	window.jQuery,
	window.heshOptions
);
