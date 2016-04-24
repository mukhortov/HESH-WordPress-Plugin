// Codemirror v4.1 JS files:
// codemirror.js, css.js, htmlmixed.js, javascript.js, xml.js, active-line.js, matchbrackets.js

// @codekit-prepend "codemirror/codemirror.js";
// @codekit-prepend "codemirror/css.js";
// @codekit-prepend "codemirror/htmlmixed.js";
// @codekit-prepend "codemirror/javascript.js";
// @codekit-prepend "codemirror/xml.js";
// @codekit-prepend "codemirror/active-line.js";
// @codekit-prepend "codemirror/matchbrackets.js";

// Concatenate and minify all the files above with the rest of code and save as hesh.min.js

/*
 * Plugin Name: HTML Editor Syntax Highlighter
 * Author: Petr Mukhortov
 * Author URI: http://mukhortov.com/
 * Version: 1.6.9
*/

function heshPlugin() {
	var editor = null,
		isOn = 0,
		buttonsAdded = 0,
		target = document.getElementById("content"),
		postID = document.getElementById("post_ID") !== null ? document.getElementById("post_ID").value : 0,
		tab_html = document.getElementById("content-html"),
		tab_tmce = document.getElementById("content-tmce"),
		theme = document.cookie.indexOf("hesh_plugin_theme=mbo") !== -1 ? 'mbo' : 'default',
		visualEditor = document.cookie.indexOf("editor%3Dtinymce") !== -1 ? true : false,
		visualEditorEnabled = document.getElementById("content-tmce") !== null ? true : false,
		toolbar = document.getElementById("ed_toolbar"),
		fullscreenBox = document.getElementById("wp-content-editor-container"),
		fullscreenClass = "heshFullscreen",
		publishButton = document.getElementById('publish'),

		options = {
			mode: "text/html",
			tabMode: "indent",
			theme: theme,
			lineNumbers: true,
			matchBrackets: true,
			indentUnit: 4,
			indentWithTabs: true,
			enterMode: "keep",
			lineWrapping: true,
			autofocus: true,
			styleActiveLine: true,
			electricChars: false,
			extraKeys: {
				"F11": function() {
					toggleFullscreen();
				},
				"Esc": function() {
					toggleFullscreen();
				},
				"Ctrl-S": function(){
					publishButton.click();
				},
				"Cmd-S": function(){
					publishButton.click();
				}
			}
		},

	getCookie = function(name){
		var value = "; " + document.cookie;
		var parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
	},

	fontSize = getCookie('hesh_plugin_font_size') || '12',

	runEditor = function() {
		addButtons();
		editor = CodeMirror.fromTextArea(target, options);

		//Save changes to the textarea on the fly
		editor.on("change", function() {
			editor.save();

			clearTimeout(ontypeSaveTimer);	
			ontypeSaveTimer = setTimeout(updateTextareaHeight, 3000);
		});

		//Saving cursor state
		editor.on('cursorActivity', function() {
			var curPos = editor.getCursor();
			document.cookie = 'hesh_plugin_pos='+postID + ',' + curPos.line + ',' + curPos.ch;
		});

		//Restoring cursor state
		var curPos = (getCookie('hesh_plugin_pos') || '0,0,0').split(',');
		if (postID === curPos[0]) {
			editor.setCursor(parseFloat(curPos[1]),parseFloat(curPos[2]));
		}

		resizeEditor();
		addMedia();
		isOn = 1;

		updateTabBarPaddings();
		window.addEventListener("resize", windowResized);

		// Fix for floating tabbar in full-height mode
		window.setTimeout(updateTextareaHeight, 3000);
	},

	updateTabBarPaddings = function() {
		document.querySelector('.CodeMirror').style.marginTop = toolbar.clientHeight + 'px';
	},

	windowResizeTimer,

	windowResized = function() {
		clearTimeout(windowResizeTimer);
		windowResizeTimer = setTimeout(updateTabBarPaddings, 250);		
	},

	ontypeSaveTimer,

	updateTextareaHeight = function() {
		if (document.querySelector('.CodeMirror') != null) {
			document.querySelector('textarea.wp-editor-area').style.height = document.querySelector('.CodeMirror').clientHeight + 'px';
		}
	},

	addButtons = function() {
		if (!buttonsAdded) {
			var toolbarVars = {
				more:		['<!--more-->',''],
				comment:	['<!-- ',' -->'],
				code:		['<code>','</code>'],
				li:			['<li>','</li>'],
				ol:			['<ol>','</ol>'],
				ul:			['<ul>','</ul>'],
				img:		['<img src="$" alt="','">','Enter the URL of the image'],
				ins:		['<ins>','</ins>'],
				del:		['<del>','</del>'],
				link:		['<a href="$">','</a>','Enter the destination URL'],
				blockquote:	['\r<blockquote>','</blockquote>\r'],
				h3:			['<h3>','</h3>'],
				h2:			['<h2>','</h2>'],
				h1:			['<h1>','</h1>'],
				p:			['<p>','</p>'],
				i:			['<em>','</em>'],
				b:			['<strong>','</strong>']
			};
			for (var key in toolbarVars) {
				var t = toolbarVars[key];
				var t3 = t[2] ? 'data-prompt="'+t[2]+'"' : '';
				toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_'+key+'" data-start=\''+t[0]+'\' data-end=\''+t[1]+'\' '+t3+' class="ed_button button cm_ed_button" value="'+key+'">');
				document.getElementById('cm_content_'+key).onclick = buttonClick;
			}
			themeSwitcher();
			fontSizeSwitcher();
			fullscreen();
			buttonsAdded = 1;
		}
	},

	buttonClick = function() {
		var selStart = editor.getCursor('start'),
			start = this.getAttribute('data-start'),
			end = this.getAttribute('data-end'),
			cmPrompt = this.getAttribute('data-prompt') || null,
			selText = editor.getSelection();
		if (this.id === 'cm_content_link' && wpLink) { //Native WP link popup window
			wpLink.open();
			document.getElementById('wp-link-submit').onclick = function() {
				var attrs = wpLink.getAttrs();
				start = '<a href="' + attrs.href + '" title="' + attrs.title + '" target="' + attrs.target + '">';
				editor.replaceSelection(start + selText + '</a>');
				wpLink.close();
				//editor.setSelection(selStart, editor.getCursor("end"));
				editor.setCursor(selStart.line, selStart.ch + start.length);
				editor.focus();
			};
		} else {
			if (cmPrompt) start = start.replace('$', prompt(cmPrompt, ''));
			editor.replaceSelection(start + selText+end);
			//editor.setSelection(selStart, editor.getCursor("end"));
			editor.setCursor(selStart.line, selStart.ch + start.length);
			editor.focus();
		}
	},

	toVisual = function() {
		if (isOn) {
			if (!!switchEditors.switchto) switchEditors.switchto(this);
			editor.toTextArea();
			tab_html.onclick = toHTML;
			isOn = 0;
			window.removeEventListener("resize", windowResized);
		}
	},

	toHTML = function() {
		if (!isOn) {
			if (!!switchEditors.switchto) switchEditors.switchto(this);
			window.setTimeout(runEditor, 300);
			tab_tmce.onclick = toVisual;
			//addMedia();
		}
	},

	resizeEditor = function() {
		var target = document.querySelector('.CodeMirror'),
			handle = document.createElement('div'),
			hwrap = document.getElementById('wp-content-wrap'),
			offsetTop = target.getBoundingClientRect().top,
			move = function(e) {
				e = e || window.event; // IE fix
				var height = (e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop) - offsetTop;
				target.style.height = (height > 10 ? height : 10) + 'px';
				window.getSelection().removeAllRanges(); //disable selection on resize
			};
		handle.className = 'content-resize-handle';
		hwrap.appendChild(handle);
		handle.onmousedown = function() {
			document.onmousemove = move;
		};
		document.onmouseup = function() {
			document.onmousemove = null;
			//editor.focus();
		};
	},

	toggleFullscreen = function() {
		fullscreenBox.className = fullscreenBox.className.indexOf(fullscreenClass) === -1 ? fullscreenBox.className +' '+ fullscreenClass : fullscreenBox.className.replace(fullscreenClass, '');
		//this.value = this.value == 'fullscreen' ? 'exit fullscreen' : 'fullscreen';
		var btn = document.getElementById('cm_content_fullscreen');
		btn.value = btn.value === 'fullscreen' ? 'exit fullscreen' : 'fullscreen';
		editor.focus();
	},

	fullscreen = function() {
		toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_fullscreen" class="ed_button button" title="Toggle fullscreen mode" value="fullscreen">');
		document.getElementById('cm_content_fullscreen').onclick = toggleFullscreen;
	},

	themeSwitcher = function() {
		var colour = function () {
			return theme === 'mbo' ? 'light' : 'dark';
		};
		toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_select_theme" class="ed_button button" title="Change editor colour scheme" value="' + colour() + '">');
		document.getElementById("cm_select_theme").onclick = function() {
			theme = theme === 'mbo' ? 'default' : 'mbo';
			editor.setOption('theme', theme);
			document.cookie = 'hesh_plugin_theme='+theme;
			this.value = colour();
		};
	},

	changeFontSize = function() {
		var heshStyle = document.getElementById('hesh-style'),
			style = '.CodeMirror {font-size: ' + fontSize + 'px !important;}';
		if (heshStyle) {
			heshStyle.innerHTML = style;
		} else {
			document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', '<style id="hesh-style">' + style + '</style>')
		}
	},

	fontSizeSwitcher = function() {
		toolbar.insertAdjacentHTML('afterbegin',
		'<select id="cm_font_size" class="button">'+
			'<option value="10">10</option>'+
			'<option value="11">11</option>'+
			'<option value="12">12</option>'+
			'<option value="13">13</option>'+
			'<option value="14">14</option>'+
			'<option value="16">16</option>'+
			'<option value="18">18</option>'+
			'<option value="20">20</option>'+
			'<option value="22">22</option>'+
		'</select>');
		var selector = document.getElementById('cm_font_size');
		changeFontSize();
		selector.value = fontSize;
		selector.onchange = function() {
			fontSize = this.value;
			changeFontSize();
			// Dirty Fix
			editor.toTextArea();
			runEditor();
			editor.focus();
			
			document.cookie = 'hesh_plugin_font_size=' + fontSize;
		};
	},

	addMedia = function() {
		// We want to do it only ones
		if (!window.send_to_editor_wp) {
			window.send_to_editor_wp = send_to_editor;
			send_to_editor = function (media) {
				if (isOn && wpActiveEditor === 'content') {
					editor.replaceSelection(media);
					editor.save();
				} else {
					window.send_to_editor_wp(media);
				}
			};
		}
	};

	/* Initialise */
	if (visualEditor && visualEditorEnabled) {
		tab_html.onclick = toHTML;
	} else {
		runEditor();
		if (visualEditorEnabled) {
			tab_tmce.onclick = toVisual;
		} else {
			document.body.className += " visual-editor-is-disabled";
		}
	}
}
window.onload = heshPlugin;

