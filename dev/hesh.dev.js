/**
 * @name     HTML Editor Syntax Highlighter
 * @author   Petr Mukhortov
 * @link     http://mukhortov.com/
 * @author   James Bradford
 * @link     http://arniebradfo.com/
 * @since    1.7.1
*/

(function (document, window, CodeMirror, CodeMirrorCSS, wpLink, switchEditors) {
	'use strict';

	function heshPlugin () {
		var editor = null;
		var isOn = false;
		var buttonsAdded = false;
		var target = document.getElementById('content');
		var postID = document.getElementById('post_ID') != null ? document.getElementById('post_ID').value : 0;
		var tab_html = document.getElementById('content-html');
		var tab_tmce = document.getElementById('content-tmce');
		var visualEditor = document.cookie.indexOf('editor%3Dhtml') !== -1 ? false : true;
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

		var getCookie = function (name) {
			var value = '; ' + document.cookie;
			var parts = value.split('; ' + name + '=');
			if (parts.length === 2) return parts.pop().split(';').shift();
		};

		var fontSize = getCookie('hesh_plugin_font_size') || '12';

		options.theme = getCookie('hesh_plugin_theme') || 'material';

		var runEditor = function () {
			editor = CodeMirror.fromTextArea(target, options);
			addButtons();

			// Save changes to the textarea on the fly
			editor.on('change', function () {
				editor.save();
				clearTimeout(ontypeSaveTimer);
				ontypeSaveTimer = setTimeout(updateTextareaHeight, 3000);
			});

			// Saving cursor state
			editor.on('cursorActivity', function () {
				var curPos = editor.getCursor();
				document.cookie = 'hesh_plugin_pos=' + postID + ',' + curPos.line + ',' + curPos.ch;
			});

			// Restoring cursor state
			var curPos = (getCookie('hesh_plugin_pos') || '0,0,0').split(',');
			if (postID === curPos[0]) {
				editor.setCursor(parseFloat(curPos[1]), parseFloat(curPos[2]));
			}

			resizeEditor();
			remapAddMedia();
			isOn = true;

			updateTabBarPaddings();
			window.addEventListener('resize', windowResized);

			// Fix for floating tabbar in full-height mode
			window.setTimeout(updateTextareaHeight, 3000);
		};

		var updateTabBarPaddings = function () {
			var CodeM = document.querySelector('.CodeMirror');
			CodeM.style.marginTop = toolbar.clientHeight + 'px';
		};

		var windowResizeTimer;
		var windowResized = function () {
			clearTimeout(windowResizeTimer);
			windowResizeTimer = setTimeout(updateTabBarPaddings, 250);
		};

		var ontypeSaveTimer;
		var updateTextareaHeight = function () {
			if (document.querySelector('.CodeMirror') !== null) {
				document.querySelector('textarea.wp-editor-area').style.height = document.querySelector('.CodeMirror').clientHeight + 'px';
			}
		};

		var addButtons = function () {
			if (!buttonsAdded) {
				var toolbarVars = {
					more: ['<!--more-->', ''],
					comment: ['<!-- ', ' -->'],
					code: ['<code>', '</code>'],
					li: ['<li>', '</li>'],
					ol: ['<ol>', '</ol>'],
					ul: ['<ul>', '</ul>'],
					img: ['<img src="$" alt="', '">', 'Enter the URL of the image'],
					ins: ['<ins>', '</ins>'],
					del: ['<del>', '</del>'],
					link: ['<a href="$">', '</a>', 'Enter the destination URL'],
					blockquote:	['\r<blockquote>', '</blockquote>\r'],
					h3: ['<h3>', '</h3>'],
					h2: ['<h2>', '</h2>'],
					h1: ['<h1>', '</h1>'],
					p: ['<p>', '</p>'],
					i: ['<em>', '</em>'],
					b: ['<strong>', '</strong>']
				};
				for (var key in toolbarVars) {
					var t = toolbarVars[key];
					var t3 = t[2] ? 'data-prompt="' + t[2] + '"' : '';
					toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_' + key + '" data-start=\'' + t[0] + '\' data-end=\'' + t[1] + '\' ' + t3 + ' class="ed_button button cm_ed_button" value="' + key + '">');
					document.getElementById('cm_content_' + key).onclick = buttonClick;
				}
				themeSwitcher();
				fontSizeSwitcher();
				fullscreen();
				buttonsAdded = true;
			}
		};

		var buttonClick = function () {
			var selStart = editor.getCursor('start');
			var start = this.getAttribute('data-start');
			var end = this.getAttribute('data-end');
			var cmPrompt = this.getAttribute('data-prompt') || null;
			var selText = editor.getSelection();
			if (this.id === 'cm_content_link' && wpLink) { // Native WP link popup window
				wpLink.open();
				document.getElementById('wp-link-submit').onclick = function () {
					var attrs = wpLink.getAttrs();
					start = '<a href="' + attrs.href + '" title="' + attrs.title + '" target="' + attrs.target + '">';
					editor.replaceSelection(start + selText + '</a>');
					wpLink.close();
					// editor.setSelection(selStart, editor.getCursor('end'));
					editor.setCursor(selStart.line, selStart.ch + start.length);
					editor.focus();
				};
			} else {
				if (cmPrompt) start = start.replace('$', window.prompt(cmPrompt, ''));
				editor.replaceSelection(start + selText + end);
				// editor.setSelection(selStart, editor.getCursor('end'));
				editor.setCursor(selStart.line, selStart.ch + start.length);
				editor.focus();
			}
		};

		var toVisual = function () {
			if (isOn) {
				if (switchEditors.switchto) switchEditors.switchto(this);
				editor.toTextArea();
				tab_html.onclick = toHTML;
				isOn = false;
				window.removeEventListener('resize', windowResized);
			}
		};

		var toHTML = function () {
			if (!isOn) {
				if (switchEditors.switchto) switchEditors.switchto(this);
				window.setTimeout(runEditor, 300);
				tab_tmce.onclick = toVisual;
			}
		};

		var resizeEditor = function () {
			var target = document.querySelector('.CodeMirror');
			var handle = document.createElement('div');
			var hwrap = document.getElementById('wp-content-wrap');
			var offsetTop = target.getBoundingClientRect().top;
			var move = function (e) {
				e = e || window.event; // IE fix
				var height = (e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop) - offsetTop;
				target.style.height = (height > 10 ? height : 10) + 'px';
				window.getSelection().removeAllRanges(); // disable selection on resize
			};
			handle.className = 'content-resize-handle';
			hwrap.appendChild(handle);
			handle.onmousedown = function () {
				document.onmousemove = move;
			};
			document.onmouseup = function () {
				document.onmousemove = null;
				// editor.focus();
			};
		};

		var toggleFullscreen = function () {
			fullscreenBox.className = fullscreenBox.className.indexOf(fullscreenClass) === -1 ? fullscreenBox.className + ' ' + fullscreenClass : fullscreenBox.className.replace(fullscreenClass, '');
			// this.value = this.value == 'fullscreen' ? 'exit fullscreen' : 'fullscreen';
			var btn = document.getElementById('cm_content_fullscreen');
			btn.value = btn.value === 'fullscreen' ? 'exit fullscreen' : 'fullscreen';
			editor.focus();
			updateTabBarPaddings();
		};

		var fullscreen = function () {
			toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_fullscreen" class="ed_button button" title="Toggle fullscreen mode" value="fullscreen">');
			document.getElementById('cm_content_fullscreen').onclick = toggleFullscreen;
		};

		var themeSwitcher = function () {
			var themeSelect = '<select id="cm_select_theme" class="button" title="Change editor colour scheme">';
			for (var key in CodeMirrorCSS.Themes) {
				var csstheme = CodeMirrorCSS.Themes[key];
				var selected = csstheme === options.theme ? ' selected ' : '';
				themeSelect += '<option value="' + csstheme + '"' + selected + '>' + csstheme + '</option>';
			}
			themeSelect += '</select>';
			toolbar.insertAdjacentHTML('afterbegin', themeSelect);
			document.getElementById('cm_select_theme').onchange = function () {
				var theme = this.value;
				editor.setOption('theme', theme);
				document.cookie = 'hesh_plugin_theme=' + theme;
			};
		};

		var changeFontSize = function () {
			document.getElementsByClassName('CodeMirror')[0].style.fontSize = fontSize + 'px';
			editor.refresh();
		};

		var fontSizeSwitcher = function () {
			toolbar.insertAdjacentHTML('afterbegin',
			'<select id="cm_font_size" class="button">' +
				'<option value="10">10</option>' +
				'<option value="11">11</option>' +
				'<option value="12">12</option>' +
				'<option value="13">13</option>' +
				'<option value="14">14</option>' +
				'<option value="16">16</option>' +
				'<option value="18">18</option>' +
				'<option value="20">20</option>' +
				'<option value="22">22</option>' +
			'</select>');
			var selector = document.getElementById('cm_font_size');
			changeFontSize();
			selector.value = fontSize;
			selector.onchange = function () {
				fontSize = this.value;
				changeFontSize();
				document.cookie = 'hesh_plugin_font_size=' + fontSize;
			};
		};

		var remapAddMedia = function () {
			window.send_to_editor_wp = window.send_to_editor; // remap wp native func
			var send_to_editor = function (html) {
				if (isOn && window.wpActiveEditor === 'content') {
					editor.replaceSelection(html);
					editor.save();
				} else {
					window.send_to_editor_wp(html);
				}
			};
			window.send_to_editor = send_to_editor;
		};

		// Initialise //
		if (visualEditor && visualEditorEnabled) {
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
})(document, window, window.CodeMirror, CodeMirrorCSS, window.wpLink, window.switchEditors);
