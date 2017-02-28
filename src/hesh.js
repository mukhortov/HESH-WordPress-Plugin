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
	switchEditors,
	$,
	heshOptions
) {
	'use strict';

	var editor;
	var scrollPanel;
	var isActive = false;
	var settingsPanel = document.getElementById('CodeMirror-settings');
	var toobar = document.getElementById('ed_toolbar');
	var isThemeOrPluginEditorPage = document.getElementById('newcontent') != null;
	var target = document.getElementById('content') || document.getElementById('newcontent');
	var tabHTML = document.getElementById('content-html');
	var tabTinyMCE = document.getElementById('content-tmce');
	var isVisualEditorActive = document.getElementsByClassName('tmce-active')[0] != null;
	var isVisualEditorEnabled = document.getElementById('content-tmce') != null;
	var publishButton = document.getElementById('save-post') || document.getElementById('publish');
	var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
	var fontSize = +heshOptions.fontSize;
	var lineHeight = +heshOptions.lineHeight;

	var fullHeightToggle = document.getElementById('editor-expand-toggle');
	function isFullHeight() {
		if (!fullHeightToggle) return false;
		return fullHeightToggle.checked;
	}

	function attachFullHeightToggle() {
		if (!fullHeightToggle) return;
		fullHeightToggle.addEventListener('change', fullHeightToggled);
		fullHeightToggled();
	}
	function fullHeightMatch() {
		editor.getTextArea().style.height = editor.getWrapperElement().getBoundingClientRect().height + 'px';
	}

	function setFixedValues() {
		var toobarRect = toobar.getBoundingClientRect();
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = 'fixed';
			element.style.top = toobarRect.bottom + 'px';
			element.style.right = (window.innerWidth - toobarRect.right) + 'px';
			if (!element.id.includes('toggle'))	{
				element.style.left = toobarRect.left + 'px';
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
		// console.log('setmaxheight');
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
		// console.log('removemaxheight');
		settingsPanel.querySelector('#CodeMirror-settings__form').style.maxHeight = '';
	}

	var isFixed = false;
	var setFixedNotScheduled = true;
	function fixedSettings() {
		if (setFixedNotScheduled) {
			window.requestAnimationFrame(function(){
				var wasntFixed = !isFixed;
				isFixed = (toobar && toobar.style.position === 'fixed');
				if (isFixed && wasntFixed) setFixedValues();
				else if (!isFixed && !wasntFixed) removeFixedValues();
				setFullHeightMaxHeight();
				setFixedNotScheduled = true;
			});
			setFixedNotScheduled = false;
		}
	}

	function fullHeightToggled() {
		// console.log('fullHeightToggled');
		if (isFullHeight()) {
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
		editor.getTextArea().style.display = 'none'; // just to make sure
	}

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
		if (event.target.id.includes('advanced')) {
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
		toobar.insertAdjacentHTML(
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
			if (isFullHeight()) matchTextAreaMarginTop();
			// editor.refresh();
		});
		if (!isFullHeight()) matchTextAreaHeight();
	}

	function getCookie(name) {
		var value = '; ' + document.cookie;
		var parts = value.split('; ' + name + '=');
		if (parts.length === 2) return parts.pop().split(';').shift();
	}

	function toVisual() {
		if (isActive) {
			if (switchEditors.switchto) switchEditors.switchto(this);
			editor.toTextArea();
			window.clearInterval(checkEditorInterval);
			tabHTML.onclick = toHTML;
			isActive = false;
		}
	}

	function toHTML() {
		if (!isActive) {
			if (switchEditors.switchto) switchEditors.switchto(this);
			window.setTimeout(runEditor, 0);
			tabTinyMCE.onclick = toVisual;
		}
	}

	// updates the user settings in the wordpress DB
	function submitForm() {
		var formArray = $('#CodeMirror-settings__form').serializeArray();
		// TODO: drop jQuery dependency
		// console.log(formArray); // for debug
		$.post(heshOptions.ajaxUrl, formArray, function (response) {
			// console.log(response); // for debug
		});
	}

	function isSafari() {
		// TODO: test for focus change here.
		return true;
	}
	var thisIsSafari = isSafari();
	
	var checkEditorInterval;
	function startEditor() {

		// change the mode if on the theme/plugin editor page
		if (isThemeOrPluginEditorPage){
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

		// start up codemirror
		editor = CodeMirror.fromTextArea(target, options);
		scrollPanel = editor.getWrapperElement().querySelector('.CodeMirror-code');

		editor.on('cursorActivity', function (instance) {
			// console.log('cursorActivity');
			// matain cursor & selection pairity between codemirror and the textarea
			var cursorPosition = instance.doc.getCursor();
			var scrollPosition = editor.getScrollInfo();
			var position = 0;
			var i = 0;
			instance.doc.eachLine(function(line){
				if (i > (cursorPosition.line - 1)) return;
				position += line.text.length + 1; 
				i++;
			});
			position += cursorPosition.ch;
			// console.dir(instance.getTextArea());
			// instance.getTextArea().disabled = true;
			instance.getTextArea().selectionStart = instance.getTextArea().selectionEnd = position;
			if (thisIsSafari) editor.focus(); // for safari ?
			if (thisIsSafari) editor.scrollTo(scrollPosition.left, scrollPosition.top); // for safari ?
			// editor.setCursor(cursorPosition.line, cursorPosition.ch);  // for safari ?

			// Saving cursor state
			document.cookie = 'hesh_plugin_cursor_position=' + postID + ',' + cursorPosition.line + ',' + cursorPosition.ch;
		});

		// Restoring cursor state
		var cursorCookiePosition = (getCookie('hesh_plugin_cursor_position') || '0,0,0').split(',');
		if (postID === cursorCookiePosition[0]) {
			editor.setCursor(+cursorCookiePosition[1], +cursorCookiePosition[2]);
		}

		// Save save all changes to the textarea.value
		editor.on('change', function (instance) {
			// console.log('change');
			instance.save();
		});

		// Check if any edits were made to the textarea.value at 20Hz
		checkEditorInterval = window.setInterval(function () {
			var editorLength = editor.doc.getValue().length;
			var textAreaLength = editor.getTextArea().value.length;
			if (editorLength !== textAreaLength) { // if there were changes...

				// save the cursor state
				var cursorPosition = editor.doc.getCursor();
				var scrollPosition = editor.getScrollInfo();
				// console.log(scrollPosition);

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
				if (thisIsSafari) editor.scrollTo(scrollPosition.left, scrollPosition.top); // for safari ?
				// editor.focus(); // for safari ?

			}
		}, 50); // run it 20times/second
	}

	function runEditor() {
		startEditor();
		if (isThemeOrPluginEditorPage){ 
			attachResizeThemeOrPlugin();
		} else {
			attachResizePostOrPage();
			attachFullHeightToggle();
			attachFullscreen();
		}
		attachSettings();
		setFontSizeAndLineHeight();
		isActive = true;
	}

	function initialise() {
		if (isThemeOrPluginEditorPage){
			runEditor();
		} else if (isVisualEditorEnabled && isVisualEditorActive) {
			tabHTML.onclick = toHTML;
		} else {
			runEditor();
			if (isVisualEditorEnabled) tabTinyMCE.onclick = toVisual;
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
	window.jQuery,
	window.heshOptions
);
