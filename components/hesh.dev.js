// Codemirror v3.20 CSS files:
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
 * Version: 1.4.6
*/

function heshPlugin() {
	var editor = null,
		isOn = 0,
		buttonsAdded = 0,
		target = document.getElementById("content"),
		postID = document.getElementById("post_ID") !== null ? document.getElementById("post_ID").value : 0,
		tab_html = document.getElementById("content-html"),
		tab_tmce = document.getElementById("content-tmce"),
		visualEditor = document.cookie.indexOf("editor%3Dtinymce") !== -1 ? true : false,
		visualEditorEnabled = document.getElementById("content-tmce") !== null ? true : false,
		fullscreenBox = document.getElementById("wp-content-editor-container"),
		fullscreenClass = "heshFullscreen",
		publishButton = document.getElementById('publish'),
		options = {
			mode: "text/html",
			tabMode: "indent",
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
	addButtons = function() {
		var toolbar = document.getElementById("ed_toolbar");
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
				i:			['<em>','</em>'],
				b:			['<strong>','</strong>']
			};
			for (var key in toolbarVars) {
				var t = toolbarVars[key];
				var t3 = t[2] ? 'data-prompt="'+t[2]+'"' : '';
				toolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_'+key+'" data-start=\''+t[0]+'\' data-end=\''+t[1]+'\' '+t3+' class="ed_button cm_ed_button" value="'+key+'">');
				document.getElementById('cm_content_'+key).onclick = buttonClick;
			}
			fullscreen();
			buttonsAdded = 1;
		}
	},
	buttonClick = function() {
		var selStart = editor.getCursor("start"),
			start = this.getAttribute('data-start'),
			end = this.getAttribute('data-end'),
			cmPrompt = this.getAttribute('data-prompt') || null,
			selText = editor.getSelection();
		if (cmPrompt) start = start.replace('$',prompt(cmPrompt, ''));
		editor.replaceSelection(start+selText+end);
		editor.setSelection(selStart, editor.getCursor("end"));
		editor.setCursor(selStart.line, selStart.ch + start.length);
		editor.focus();
	},
	runEditor = function(target) {
		editor = CodeMirror.fromTextArea(target, options);
		//Save changes to the textarea on the fly
		editor.on("change", function() {
			editor.save();
		});
		//Saving cursor state
		editor.on("cursorActivity", function() {
			var curPos = editor.getCursor();
			window.name = postID + ',' + curPos.line + ',' + curPos.ch;
		});
		//Restoring cursor state
		var curPos = window.name.split(',');
		if (postID === curPos[0]) {
			editor.setCursor(parseFloat(curPos[1]),parseFloat(curPos[2]));
		}
		addButtons();
		resizeEditor();
		addMedia();
		isOn = 1;
	},
	toVisual = function() {
		if (isOn) {
			editor.toTextArea();
			tab_html.onclick = toHTML;
			switchEditors.switchto(this);
			isOn = 0;
		}
	},
	toHTML = function() {
		if (!isOn) {
			switchEditors.switchto(this);
			runEditor(target);
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
		document.getElementById("ed_toolbar").insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_fullscreen" class="ed_button" title="Toggle fullscreen mode" value="fullscreen">');
		document.getElementById('cm_content_fullscreen').onclick = toggleFullscreen;
	},
	addMedia = function() {
		// We want to do it only ones
		if (!window.send_to_editor_wp) {
			window.send_to_editor_wp = window.send_to_editor;
			window.send_to_editor = function (media) {
				if (isOn) {
					editor.replaceSelection(media);
					editor.save();
				} else {
					window.send_to_editor_wp(media);
				}
			}
		}
	};

	/* Initialise */
	if (visualEditor && visualEditorEnabled) {
		tab_html.onclick = toHTML;
	} else {
		runEditor(target);
		if (visualEditorEnabled) tab_tmce.onclick = toVisual;
	}

}
window.onload = heshPlugin;