/**
 * @name     HTML Editor Syntax Highlighter
 * @author   James Bradford
 * @link     http://arniebradfo.com/
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
 * @since    2.0.0
*/

// console.log(window.heshOptions); // from wordpress php

(function (
	document,
	window,
	CodeMirror,
	$,
	heshOptions
) {
	'use strict';



	// ELEMENTS //
	var editor;
	var scrollPanel;
	var settingsPanel = document.getElementById('CodeMirror-settings');
	var theForm = document.getElementById('CodeMirror-settings__form');
	var toolbar = document.getElementById('ed_toolbar');
	var target = document.getElementById('content') || document.getElementById('newcontent');
	var tabText = document.getElementById('content-html');
	var tabVisual = document.getElementById('content-tmce');
	var publishButton = document.getElementById('save-post') || document.getElementById('publish');
	var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
	var fullHeightToggle = document.getElementById('editor-expand-toggle');

	var state = {
		isVisualEnabled: document.getElementById('content-tmce') != null,
		isThemeOrPlugin: document.getElementById('newcontent') != null,

		isActive: function () {
			return document.getElementsByClassName('CodeMirror')[0] != null;
		},

		isVisualActive: function () {
			return document.getElementsByClassName('tmce-active')[0] != null;
		},

		isFullHeight: function () {
			if (!fullHeightToggle) return false;
			return fullHeightToggle.checked;
		},

		previousSettingsPosition: 'none',
		settingsPosition: function () { // : 'top' | 'middle' | 'bottom' | 'normal' | 'none'
			var position;
			var self = this;
			if (!toolbar) {
				position = 'none';
			} else if (toolbar.style.position === 'absolute') {
				if (toolbar.style.top === '0px') position = 'top';
				else position = 'bottom';
			} else if (toolbar.style.position === 'fixed') {
				position = 'middle';
			} else {
				position = 'normal';
			}
			window.setTimeout(function () {
				self.previousSettingsPosition = position;
			}, 0);
			return position;
		}
	};

	var fontSize = +heshOptions.fontSize;
	var lineHeight = +heshOptions.lineHeight;

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
	


	function throttleAnimationFrame (callback) {
		var wait = false;
		return function () {
			var context = this, args = arguments;
			if (!wait) {
				callback.apply(context, args);
				wait = true;
				window.requestAnimationFrame(function () {
					window.requestAnimationFrame(function () {
						wait = false;
					});
				});
			}
		};
	}


	
	function setSettingsPositionTopValues() {
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = '';
			element.style.top = '';
			element.style.left = '';
			element.style.right = '';
			element.style.width = '';
		}
	}

	function setSettingsPositionMiddleValues() {
		var toolbarRect = toolbar.getBoundingClientRect();
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = 'fixed';
			element.style.top = toolbarRect.bottom + 'px';
			element.style.right = (document.documentElement.getBoundingClientRect().width - toolbarRect.right) + 'px';
			if (!element.id.match(/toggle/ig)) {
				element.style.left = toolbarRect.left + 'px';
				element.style.width = 'auto';
			}
		}
	}

	function setSettingsPositionBottomValues() {
		var toolbarRect = toolbar.getBoundingClientRect();
		var codeMirrorRect = editor.getWrapperElement().getBoundingClientRect();
		for (var index = 0; index < settingsPanel.children.length; index++) {
			var element = settingsPanel.children[index];
			element.style.position = 'absolute';
			element.style.top = (codeMirrorRect.top - toolbarRect.bottom) * -1 + 'px';
			element.style.left = '';
			element.style.right = '';
			element.style.width = '';
		}
	}

	var throttledSetSettingsPosition = throttleAnimationFrame(setSettingsPosition);
	function setSettingsPosition(event) {
		updateFullHeightMaxHeight();
		var currentSettingsPosition = state.settingsPosition();
		if (currentSettingsPosition === state.previousSettingsPosition && !(event && event.type === 'resize')) return;
		fullHeightMatch();
		switch (currentSettingsPosition) {
			case 'top':
				setSettingsPositionTopValues();
				break;
			case 'middle':
				setSettingsPositionMiddleValues();
				break;
			case 'bottom':
				setSettingsPositionBottomValues();
				break;
			case 'normal':
			case 'none':
				break;
		}
	}



	var isIE = !!navigator.userAgent.match(/Trident/ig);
	
	function updateFullHeightMaxHeight() {
		if (!theForm) return;
		var margin = 6; // arbitrary
		var formTop = theForm.getBoundingClientRect().top;
		var editorBottom = document.getElementById('post-status-info').getBoundingClientRect().top;
		var editorBottomMaxHeight = editorBottom - formTop;
		var screenBottomMaxHeight = window.innerHeight - formTop;
		theForm.style.maxHeight = Math.min(editorBottomMaxHeight, screenBottomMaxHeight) - margin + 'px';
		if (isIE) theForm.style.height = theForm.style.maxHeight;
	}

	function removeFullHeightMaxHeight() {
		theForm.style.maxHeight = '';
		if (isIE) theForm.style.height = '';
	}



	function attachFullHeightToggle() {
		if (!fullHeightToggle) return;
		fullHeightToggle.addEventListener('change', fullHeightToggled);
		fullHeightToggled();
	}

	function fullHeightToggled() {
		if (state.isFullHeight()) {
			editor.setOption('viewportMargin', Infinity);
			editor.on('change', fullHeightMatch);
			window.addEventListener('scroll', throttledSetSettingsPosition);
			window.addEventListener('resize', throttledSetSettingsPosition);
			window.addEventListener('resize', throttledMatchTextAreaMarginTop);
			editor.getWrapperElement().style.height = 'auto';
			setSettingsPosition();
			matchTextAreaMarginTop();
			window.setTimeout(function () {
				updateFullHeightMaxHeight();
				fullHeightMatch();
			}, 100); // TODO: find a better way to override
		} else {
			editor.setOption('viewportMargin', options.viewportMargin);
			editor.off('change', fullHeightMatch);
			window.removeEventListener('scroll', throttledSetSettingsPosition);
			window.removeEventListener('resize', throttledSetSettingsPosition);
			window.removeEventListener('resize', throttledMatchTextAreaMarginTop);
			// window.setTimeout(function(){
			editor.getWrapperElement().style.marginTop = '';
			removeFullHeightMaxHeight();
			setSettingsPositionTopValues();
			matchTextAreaHeight();
			// }, 100);
		}
	}



	// initalize the settings panel
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
			if (!settingsPanel.classList.contains('open-advanced')) setSettingsPanelState('advanced');
			else setSettingsPanelState('open');
		} else {
			if (settingsPanel.classList.contains('open')) setSettingsPanelState('closed');
			else setSettingsPanelState('open');
		}
	}

	function setSettingsPanelState(toState) {
		switch (toState) {
			case 'open':
				settingsPanel.classList.add('open');
				settingsPanel.classList.remove('open-advanced');
				settingsPanel.classList.remove('closed');
				break;
			case 'advanced':
				settingsPanel.classList.add('open');
				settingsPanel.classList.add('open-advanced');
				settingsPanel.classList.remove('closed');
				break;
			// case 'closed':
			default:
				settingsPanel.classList.remove('open');
				settingsPanel.classList.remove('open-advanced');
				settingsPanel.classList.add('closed');
				break;
		}
	}



	// set a codemirror option from an input.onchange event callback
	function updateOption(event) {
		var value = +event.target.value;
		value = isNaN(value) ? event.target.value : value;
		if (event.target.checked != null) value = event.target.checked;
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



	// updates the user settings in the wordpress DB
	function submitForm() {
		var formArray = $('#CodeMirror-settings__form').serializeArray();
		// TODO: drop jQuery dependency
		// console.log(formArray); // for debug
		$.post(heshOptions.ajaxUrl, formArray, function (/*response*/) {
			// console.log(response); // for debug
		});
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
		if (state.isFullHeight()){
			fullscreenBox.classList.remove(fullscreenClass);
		} else {
			fullscreenBox.classList.toggle(fullscreenClass);
			editor.focus();
		}
	}



	function fullHeightMatch() {
		editor.save();
		editor.getTextArea().style.height = editor.getWrapperElement().getBoundingClientRect().height + 'px';
	}

	function matchTextAreaHeight() {
		editor.getWrapperElement().style.height = editor.getTextArea().style.height;
	}

	var throttledMatchTextAreaMarginTop = throttleAnimationFrame(matchTextAreaMarginTop);
	function matchTextAreaMarginTop() {
		editor.getWrapperElement().style.marginTop = editor.getTextArea().style.marginTop;
	}



	// copy the resize of the textarea in codemirror
	function attachDragResizePostOrPage() {
		document.getElementById('content-resize-handle').addEventListener('mousedown', function () {
			document.addEventListener('mousemove', matchTextAreaHeight);
		});
		document.addEventListener('mouseup', function () {
			document.removeEventListener('mousemove', matchTextAreaHeight);
			// editor.refresh(); // TODO: put this somewhere else 
		});
	}

	// attaches a dragger to the bottom right of the theme/plugin editor to control editor height
	function attachDragResizeThemeOrPlugin() {
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



	function setFileType() {
		var fileNameElement = document.querySelector('.fileedit-sub .alignleft');
		var fileTypeMatches = fileNameElement.textContent.match(/\.[a-z\d]{2,}/ig); // find the file extention
		var fileType = fileTypeMatches[fileTypeMatches.length - 1].match(/[a-z]*/ig)[1]; // remove the dot
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



	function getCookie(name) {
		var value = '; ' + document.cookie;
		var parts = value.split('; ' + name + '=');
		if (parts.length === 2) return parts.pop().split(';').shift();
	}

	function restoreSelectionState() {
		var selectionState = (getCookie('hesh_plugin_selection_state') || '0,0,0,0,0,0,0').split(',');
		if (postID === selectionState[0]) {
			editor.doc.setSelection(
				{ line: selectionState[1], ch: selectionState[2] },
				{ line: selectionState[3], ch: selectionState[4] },
				{ scroll: false }
			);
			editor.scrollTo(selectionState[5], selectionState[6]);
		}
	}

	var throttledRecordSelectionState = throttleAnimationFrame(recordSelectionState);
	function recordSelectionState() {
		var selection = editor.doc.listSelections()[0];
		var scrollPosition = editor.getScrollInfo();
		document.cookie = 'hesh_plugin_selection_state=' +
			postID + ',' +
			selection.anchor.line + ',' +
			selection.anchor.ch + ',' +
			selection.head.line + ',' +
			selection.head.ch + ',' +
			scrollPosition.left + ',' +
			scrollPosition.top;
	}



	// cursor & selection pairity between codemirror and the textarea
	function giveFocusToTextArea() {
		var selection = editor.doc.listSelections()[0];
		var head, anchor, i;
		head = anchor = i = 0;
		editor.doc.eachLine(function (line) {
			if (i <= (selection.head.line - 1)) head += line.text.length + 1;
			if (i <= (selection.anchor.line - 1)) anchor += line.text.length + 1;
			i++;
		});
		head += selection.head.ch;
		anchor += selection.anchor.ch;
		editor.getTextArea().setSelectionRange(Math.min(anchor, head), Math.max(anchor, head));
		editor.getTextArea().focus();
	}

	// Check if any edits were made to the textarea.value
	function returnFocusFromTextArea() {
		// save the selection state and scroll state
		var selectionStart = editor.getTextArea().selectionStart;
		var selectionEnd = editor.getTextArea().selectionEnd;
		var scrollPosition = editor.getScrollInfo();

		// update codemirror with the new textarea.value
		editor.doc.setValue(editor.getTextArea().value);
		editor.focus();

		var startLine = 0, endLine = 0, currentLine = 0;
		var startCh = selectionStart;
		var endCh = selectionEnd;
		var lineLength = editor.getLineHandle(currentLine).text.length + 1;
		while (lineLength <= startCh && lineLength <= endCh) {
			currentLine++;
			if (lineLength <= startCh) {
				startCh -= lineLength;
				startLine = currentLine;
			}
			if (lineLength <= endCh) {
				endCh -= lineLength;
				endLine = currentLine;
			}
			lineLength = editor.getLineHandle(currentLine).text.length + 1;
			// console.log('line: '+currentLine, 'startCh: '+startCh, 'endCh: '+endCh); // for debug
		}

		editor.doc.setSelection(
			{ line: startLine, ch: startCh },
			{ line: endLine, ch: endCh },
			{ scroll: false }
		);
		editor.scrollTo(scrollPosition.left, scrollPosition.top);

		editor.save();
	}



	function startEditor() {
		if (state.isActive()) return;

		updateOptions();

		// change the mode if on the theme/plugin editor page
		if (state.isThemeOrPlugin) setFileType();

		// start up codemirror
		editor = CodeMirror.fromTextArea(target, options);
		scrollPanel = editor.getWrapperElement().querySelector('.CodeMirror-code');
		target.classList.add('CodeMirror-mirrored');

		// Save save all changes to the textarea.value
		editor.on('change', function () { editor.save(); });

		restoreSelectionState();
		editor.on('cursorActivity', throttledRecordSelectionState);
		editor.on('scroll', throttledRecordSelectionState);

		if (state.isThemeOrPlugin) {
			attachDragResizeThemeOrPlugin();
			publishButton = document.getElementById('submit');
		} else {
			toolbar.addEventListener('mousedown', giveFocusToTextArea);
			toolbar.addEventListener('click', function () {
				window.setTimeout(returnFocusFromTextArea, 0);
			});
			attachDragResizePostOrPage();
			attachFullHeightToggle();
			attachFullscreen();
		}
		attachSettings();
		setFontSizeAndLineHeight();
	}

	function stopEditor() {
		if (!state.isActive()) return;
		setSettingsPanelState('closed');
		editor.toTextArea();
	}



	function initialise() {
		if (state.isThemeOrPlugin) {
			startEditor();
		} else if (state.isVisualEnabled) {
			tabText.addEventListener('click', function () {
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
	window.jQuery,
	window.heshOptions
);
