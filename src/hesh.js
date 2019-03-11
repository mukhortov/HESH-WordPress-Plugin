/**
 * @name     HTML Editor Syntax Highlighter
 * @author   James Bradford
 * @link     http://bradford.digital/
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
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
	var dialogPanel;
	var theForm = document.getElementById('CodeMirror-settings__form');
	var toolbar = document.getElementById('ed_toolbar');
	var target = 
		document.getElementById('content') || 
		document.getElementById('newcontent');
		// || document.getElementsByClassName('editor-post-text-editor')[0]; // only in Code Editor mode?
	var tabText = document.getElementById('content-html');
	var tabVisual = document.getElementById('content-tmce');	
	var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
	var fullHeightToggle = document.getElementById('editor-expand-toggle');

	var state = {
		isVisualEnabled: document.getElementById('content-tmce') != null,
		isThemeOrPlugin: document.getElementById('newcontent') != null, 
		// isClassicEditor: document.getElementById('???') != null, // TODO: this

		isActive: function () {
			return editor != null;
		},

		isVisualActive: function () {
			return document.getElementsByClassName('tmce-active')[0] != null;
		},

		// GUTENBERG
		isGutenberg: (wp.data && wp.data.select( 'core/edit-post' )) != null, // How good is this, still?
		isGutenbergVisualActive: function () {
			return wp.data.select( 'core/edit-post' ).getEditorMode() === 'visual';
			// TODO: issue #81 is cause by above line?
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
		},

		charWidth: 0
	};

	var options = {
		mode: 'wordpresspost',
		tabMode: 'indent',
		indentWithTabs: true,
		smartIndent: false,
		enterMode: 'keep',
		styleActiveLine: true,
		electricChars: false,
		showCursorWhenSelecting: true,
		viewportMargin: 10,
		extraKeys: {
			'F11': function () {
				toggleFullscreen();
			},
			'Esc': function () {
				toggleFullscreen(true);
			},
			'Ctrl-S': function () {
				savePostOrDraft();
			},
			'Cmd-S': function () {
				savePostOrDraft();
			},
		},
	};

	function updateOptions() {
		options.theme = heshOptions.theme;
		options.lineNumbers = !!heshOptions.lineNumbers;
		options.foldGutter = !!heshOptions.foldGutter;
		options.gutters = options.foldGutter ? ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'] : [];
		options.tabSize = options.indentUnit = +heshOptions.tabSize;  // indentUnit must always equal tabSize
		options.lineWrapping = !!heshOptions.lineWrapping;
		options.matchBrackets = !!heshOptions.matchBrackets;
		options.autoCloseTags = !!heshOptions.autoCloseTags;
		options.autoCloseBrackets = !!heshOptions.autoCloseBrackets;
		options.highlightSelectionMatches = !!heshOptions.highlightSelectionMatches;
		options.matchTags = !!heshOptions.matchTags ? { bothTags: true } : false;
		options.scrollbarStyle = !!heshOptions.scrollbarStyle ? 'overlay' : null;
		options.keyMap = heshOptions.keyMap;
		options.autofocus = document.getElementById('title')
			&& !!document.getElementById('title').value
			&& document.getElementById('title').value.length > 0;
	}


	function savePostOrDraft() {

		if (state.isGutenberg) {
			persistGutenbergChanges();
			wp.data.dispatch( 'core/editor' ).savePost();

		} else {
			var publishButton = 
				document.getElementById('save-post') || 
				document.getElementById('publish') ||
				document.getElementById('submit'); 
			publishButton.click();
		
		}		
	}

	function throttleAnimationFrame(callback) {
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
		for (var i = -1; i < settingsPanel.children.length; i++) {
			var element = i < 0 ? dialogPanel : settingsPanel.children[i];
			if (element == null) continue;
			element.style.position = '';
			element.style.top = '';
			element.style.left = '';
			element.style.right = '';
			element.style.width = '';
		}
	}

	function setSettingsPositionMiddleValues() {
		var toolbarRect = toolbar.getBoundingClientRect();
		for (var i = -1; i < settingsPanel.children.length; i++) {
			var element = i < 0 ? dialogPanel : settingsPanel.children[i];
			if (element == null) continue;
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
		for (var i = -1; i < settingsPanel.children.length; i++) {
			var element = i < 0 ? dialogPanel : settingsPanel.children[i];
			if (element == null) continue;
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


	function trackDialog(mutations) {
		for (var i = 0; i < mutations.length; i++) {
			var mutation = mutations[i];
			if (mutation.addedNodes[0] && mutation.addedNodes[0].classList.contains('CodeMirror-dialog')){
				dialogPanel = mutation.addedNodes[0];
				var buttons = dialogPanel.getElementsByTagName('button');
				for (var j = 0; j < buttons.length; j++) {
					var button = buttons[j];
					button.classList = 'button button-small';
				}
				// console.log('put breakpoint here');
			}
			else{
				dialogPanel = undefined;
				continue;
			}
		}
	}



	// initialize the settings panel
	function attachSettings() {
		// move the settingsPanel (produced in php) to inside the codemirror instance
		// TODO: issue #80 is related to this?
		editor.getWrapperElement().appendChild(settingsPanel);
		settingsPanel.style.display = 'block';
		settingsPanel.querySelector('.CodeMirror-settings__toggle').addEventListener('click', toggleSettings);
		settingsPanel.querySelector('.CodeMirror-settings__toggle-advanced').addEventListener('click', toggleSettings);

		var observer = new MutationObserver(trackDialog);
		observer.observe(editor.getWrapperElement(), { childList: true });
		
		// attach all the inputs to live update
		var options = settingsPanel.querySelectorAll('.CodeMirror-settings__option');
		for (var i = 0; i < options.length; i++) {
			var option = options[i];
			option.addEventListener('change', submitForm);
			option.addEventListener('change', updateOption);
		}
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

	function setCharWidth() {
		state.charWidth = editor.defaultCharWidth() * (heshOptions.fontSize / 13);
	}

	// set a codemirror option from an input.onchange event callback
	function updateOption(event) {
		var value = +event.target.value;
		value = isNaN(value) ? event.target.value : value;
		if (event.target.type === 'checkbox')
			value = event.target.checked;

		switch (event.target.id) {
			case 'fontSize':
				heshOptions.fontSize = value;
				scrollPanel.style.fontSize = value + 'px';
				setCharWidth();
				editor.refresh();
				break;

			case 'lineHeight':
				heshOptions.lineHeight = value;
				scrollPanel.style.lineHeight = value + 'em';
				editor.refresh();
				break;

			case 'matchTags':
				heshOptions.matchTags = value;
				editor.setOption('matchTags', value ? { bothTags: true } : null);
				break;

			case 'scrollbarStyle':
				heshOptions.scrollbarStyle = value;
				editor.setOption('scrollbarStyle', value ? 'overlay' : null);
				break;

			case 'foldGutter':
				editor.setOption('gutters', value ? ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'] : []);
				// break; // fallthrough expected here

			case 'tabSize':
				editor.setOption('indentUnit', value); // indentUnit must always equal tabSize
				// break; // fallthrough expected here

			default:
				heshOptions[event.target.id] = value;
				editor.setOption(event.target.id, value);
				break;
		}

		switch (event.target.id) { // clean up lap
			case 'lineNumbers':
				if (value && !!heshOptions.foldGutter)
					editor.setOption('gutters', ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']);
			// case 'keyMap':
			// 	stopEditor();
			// 	startEditor();
		}

	}

	function setFontSizeAndLineHeight(fontSize, lineHeight) {
		scrollPanel.style.fontSize = fontSize + 'px';
		heshOptions.fontSize = fontSize;
		scrollPanel.style.lineHeight = lineHeight + 'em';
		heshOptions.lineHeight = lineHeight;
		setCharWidth();
		editor.refresh();
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

	function toggleFullscreen(esc) {
		esc = esc === true ? true : false;
		if (state.isFullHeight()) {
			fullscreenBox.classList.remove(fullscreenClass);
		} else {
			if (!fullscreenBox.classList.contains(fullscreenClass) && !esc) {
				fullscreenBox.classList.add(fullscreenClass);
			} else {
				fullscreenBox.classList.remove(fullscreenClass);
			}
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
		editor.getWrapperElement().style.marginTop = toolbar.offsetHeight + 'px';
	}



	// copy the resize of the textarea in codemirror
	function attachDragResizeCopier() {
		document.getElementById('content-resize-handle').addEventListener('mousedown', function () {
			document.addEventListener('mousemove', matchTextAreaHeight);
		});
		document.addEventListener('mouseup', function () {
			document.removeEventListener('mousemove', matchTextAreaHeight);
			// editor.refresh(); // TODO: put this somewhere else 
		});
	}



	// DRAG RESIZE FUNCTIONS //

	var isDragging = false;
	var yStartPosition;
	var newHeight;
	var minEditorHeight = 200;
	var editorHeight = 500;

	function changeCodemirrorHeight(event) {
		newHeight = editorHeight + (event.pageY - yStartPosition);
		editor.getWrapperElement().style.height = Math.max(minEditorHeight, newHeight) + 'px';
	}

	function handleDragResize(event) {
		yStartPosition = event.pageY;
		isDragging = true;
		document.addEventListener('mousemove', changeCodemirrorHeight);
		document.addEventListener('mouseup', completeDragResize);
		event.preventDefault();
	}

	function completeDragResize(event) {
		isDragging = false;
		editorHeight = Math.max(minEditorHeight, newHeight);
		document.removeEventListener('mousemove', changeCodemirrorHeight);
		editor.refresh();
		document.removeEventListener('mouseup', completeDragResize);
	}

	// attaches a dragger to the bottom right of the theme/plugin editor to control editor height
	function attachDragResize(editorHeightSet) {
		editorHeight = editorHeightSet;
		newHeight = editorHeight;
		editor.getWrapperElement().style.height = editorHeight + 'px';
		var resizeHandle = document.createElement('div');
		resizeHandle.className = 'hesh-content-resize-handle';
		resizeHandle.id = 'content-resize-handle';
		editor.getWrapperElement().appendChild(resizeHandle);
		document.getElementById('content-resize-handle').addEventListener('mousedown', handleDragResize);
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
				{ line: +selectionState[1], ch: +selectionState[2] },
				{ line: +selectionState[3], ch: +selectionState[4] },
				{ scroll: false }
			);
			editor.scrollTo(+selectionState[5], +selectionState[6]);
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



	// make wrapped text line up with the base indentation of the line
	// https://codemirror.net/demo/indentwrap.html
	function indentWrappedLine() {
		var css = '.CodeMirror pre > * { text-indent: 0px; }';
		var head = document.head || document.getElementsByTagName('head')[0];
		var style = document.createElement('style');
		style.type = 'text/css';
		if (style.styleSheet) style.styleSheet.cssText = css;
		else style.appendChild(document.createTextNode(css));
		head.appendChild(style);

		var basePadding = 4;
		editor.on('renderLine', function (cm, line, elt) {
			var offSet = CodeMirror.countColumn(line.text, null, cm.getOption('tabSize')) * state.charWidth;
			elt.style.textIndent = '-' + offSet + 'px';
			elt.style.paddingLeft = (basePadding + offSet) + 'px';
		});
		editor.refresh();
	}



	// cursor & selection parity between codemirror and the textarea
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
		runTextAreaChangeDetection();
	}

	function runTextAreaChangeDetection() {
		var currentValueLength = editor.getTextArea().value.length;
		var checkForChanges = window.setInterval(function () {
			// console.log(editor.getTextArea().value.length);
			if (currentValueLength === editor.getTextArea().value.length) return;
			window.clearInterval(checkForChanges);
			returnFocusFromTextArea();
		}, 10);
		var clearCheckForChanges = function () {
			window.clearInterval(checkForChanges);
			editor.off('focus', clearCheckForChanges);
			// console.log(editor.getTextArea().value);
		};
		editor.on('focus', clearCheckForChanges);
	}

	// Check if any edits were made to the textarea.value
	function returnFocusFromTextArea() {
		// save the selection state and scroll state
		var selectionStart = editor.getTextArea().selectionStart;
		var selectionEnd = editor.getTextArea().selectionEnd;
		var cmScrollPosition = editor.getScrollInfo();
		var windowScrollPosition = { top: window.pageYOffset, left: window.pageXOffset }

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
		window.scrollTo(windowScrollPosition.left, windowScrollPosition.top);
		editor.scrollTo(cmScrollPosition.left, cmScrollPosition.top);

		editor.save();
	}

	// remap native WP function for adding media
	function remapAddMedia() {
		var oldSendToEditor = window.send_to_editor;
		var whichSendToEditor = function (html) {
			if (state.isActive() && window.wpActiveEditor === 'content') {
				editor.replaceSelection(html);
				editor.save();
			} else {
				oldSendToEditor(html);
			}
		};
		window.send_to_editor = whichSendToEditor;
	}

	function persistGutenbergChanges() {
		editor.save();
		recordSelectionState();
		wp.data.dispatch( 'core/editor' ).resetBlocks( 
			wp.blocks.parse( editor.getTextArea().value 
		));
		editor.setValue(
			wp.data.select( 'core/editor' ).getEditedPostContent()
		);
		restoreSelectionState();
	}

	function startEditor() {
		if (state.isActive()) return;
		if (state.isGutenberg)
			target = document.getElementsByClassName('editor-post-text-editor')[0];
		if (target == null) return; // there is no textarea				

		updateOptions();

		// change the mode if on the theme/plugin editor page
		if (state.isThemeOrPlugin) setFileType();

		// start up codemirror
		editor = CodeMirror.fromTextArea(target, options);
		scrollPanel = editor.getWrapperElement().querySelector('.CodeMirror-code');
		target.classList.add('CodeMirror-mirrored');

		// Save save all changes to the textarea.value
		if (state.isGutenberg)
			editor.on('blur', persistGutenbergChanges);
		else 
			editor.on('change', function () { editor.save(); });

		restoreSelectionState();
		editor.on('cursorActivity', throttledRecordSelectionState);
		editor.on('scroll', throttledRecordSelectionState);

		if (state.isThemeOrPlugin) {
			var height = window.innerHeight - editor.getWrapperElement().getBoundingClientRect().top - 100;
			attachDragResize(height);
		} else if (state.isGutenberg) {
			var height = window.innerHeight - editor.getWrapperElement().getBoundingClientRect().top - 16;
			attachDragResize(height);
		} else {
			toolbar.addEventListener('mousedown', giveFocusToTextArea);
			// document.getElementById('insert-media-button').addEventListener('mousedown', giveFocusToTextArea);
			remapAddMedia();
			attachDragResizeCopier();
			attachFullHeightToggle();
			attachFullscreen();
		}
		attachSettings();
		setFontSizeAndLineHeight(+heshOptions.fontSize, +heshOptions.lineHeight);
		indentWrappedLine();
	}

	function stopEditor() {
		if (!state.isActive()) return;
		setSettingsPanelState('closed');
		editor.toTextArea();
		editor = undefined; // unset editor, for state.isActive();
	}



	function initialize() {				
		if (state.isThemeOrPlugin) {
			startEditor();

		} else if (state.isGutenberg) {

			var gutenbergVisualActive = state.isGutenbergVisualActive()
			wp.data.subscribe( function () {
				// https://github.com/WordPress/gutenberg/issues/4674#issuecomment-404587928
				if (state.isGutenbergVisualActive() === gutenbergVisualActive) return;
				
				gutenbergVisualActive = state.isGutenbergVisualActive()
				
				if (gutenbergVisualActive) {
					stopEditor();
				} else {
					window.setTimeout(startEditor, 0);
				}

			});

			if (!gutenbergVisualActive)
				startEditor();
			
		} else if (state.isVisualEnabled) {

			tabText.addEventListener('click', function () {
				window.setTimeout(startEditor, 0);
			});
			tabVisual.addEventListener('click', stopEditor);
			if (!state.isVisualActive()) 
				startEditor();

		} else {

			startEditor();
			document.body.className += ' visual-editor-is-disabled';

		}
	}

	// Start Up the App
	if (document.readyState !== 'complete') {
		if (window.addEventListener) window.addEventListener('load', initialize, false);
		else if (window.attachEvent) window.attachEvent('onload', initialize);
	} else {
		initialize();
	}



})(
	document,
	window,
	window.CodeMirror,
	window.jQuery,
	window.heshOptions
);
