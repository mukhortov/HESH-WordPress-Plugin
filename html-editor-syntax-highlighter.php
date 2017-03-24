<?php
/**
 * Plugin Name: HTML Editor Syntax Highlighter
 * Plugin URI: http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description: Syntax Highlighting in WordPress HTML Editor
 * Author: Peter Mukhortov
 * Author URI: http://mukhortov.com/
 * Version: 1.3.2
 * Requires at least: 3.3
 * Tested up to: 3.6.1
 * Stable tag: 1.3.2
 **/

if(preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) { die('You are not allowed to call this page directly.'); }

define('HESH_LIBS',plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {
	public function __construct(){
		//add_action('admin_init',array(&$this,'admin_init'));
		add_action('admin_head',array(&$this,'admin_head'));
		add_action('admin_footer',array(&$this,'admin_footer'));
	}
	public function admin_footer(){
		if (!$this->is_editor())
			return;
		?>

		<script type="text/javascript">
		
			function runEditorHighlighter(el) {
				fullscreen.switchmode('html');
				//switchEditors.switchto(document.getElementById("content-html"));

				//
				var visualEditorEnabled;

				if (document.getElementById("content-tmce") != null) {
					visualEditorEnabled = true;
				} else {
					visualEditorEnabled = false;
				}

				if (visualEditorEnabled) {
					switchEditors.switchto(document.getElementById("content-html"));
				}
				// end

				var editor = CodeMirror.fromTextArea(document.getElementById(el), {
					mode: "text/html",
					tabMode: "indent",
					lineNumbers: true,
					matchBrackets: true,
					indentUnit: 4,
					indentWithTabs: true,
					enterMode: "keep",
					lineWrapping: true,
					autofocus: true,
					styleActiveLine: true
				});

				editor.on("change", function(){
					editor.save();
				});

				//Saving cursor state
				var cmPostID = document.getElementById("post_ID").value;
				editor.on("cursorActivity", function(){
					var curPos = editor.getCursor();
					window.name = cmPostID + ',' + curPos.line + ',' + curPos.ch;
				});
				//Restoring cursor state
				var curPos = window.name.split(',');
				if (cmPostID == curPos[0]) {
					editor.setCursor(parseFloat(curPos[1]),parseFloat(curPos[2]));
				}

				if (visualEditorEnabled) {
					document.getElementById("content-tmce").onclick = function(e){
						editor.toTextArea();
						switchEditors.switchto(document.getElementById("content-tmce"));
						document.getElementById("content-html").onclick = function(e){
							runEditorHighlighter("content");
						}
					}
				}
				
				document.getElementById("qt_content_fullscreen").onclick = function(e){
					editor.toTextArea();
					fullscreen.switchmode('html');
					setTimeout('runEditorHighlighter("wp_mce_fullscreen")', 2000);
					document.getElementById("wp-fullscreen-close").onclick = function(e){
						fullscreen.off();
						runEditorHighlighter("content");
						return false;
					}
				}

				/* buttons */

				var cmToolbar = document.getElementById("ed_toolbar");

				if (!cmToolbar.getAttribute('data-updated')) {
					cmToolbarVars = [
						//['search','','','Search:'],
						['more','<!--more-->',''],
						['comment','<!-- ',' -->'],
						['code','<code>','</code>'],
						['li','<li>','</li>'],
						['ol','<ol>','</ol>'],
						['ul','<ul>','</ul>'],
						['img','<img src="$" alt="','">','Enter the URL of the image'], //Enter the URL of the image | http://
						['ins','<ins>','</ins>'],
						['del','<del>','</del>'],
						['link','<a href="$">','</a>','Enter the destination URL'],
						['blockquote','\r<blockquote>','</blockquote>\r'],
						['h3','<h3>','</h3>'],
						['h2','<h2>','</h2>'],
						['h1','<h1>','</h1>'],
						['i','<em>','</em>'],
						['b','<strong>','</strong>'],

					];

					function cmToolbarClick() {
						var selStart	= editor.getCursor("start"), //var range = { from: editor.getCursor(true), to: editor.getCursor(false) },
							start		= this.getAttribute('data-start'),
							end			= this.getAttribute('data-end'),
							cmPrompt	= this.getAttribute('data-prompt'),
							selText		= editor.getSelection();
							
						if (cmPrompt) start = start.replace('$',prompt(cmPrompt, ''));

						editor.replaceSelection(start+selText+end);
						editor.setSelection(selStart, editor.getCursor("end"));
						editor.setCursor(selStart.line, selStart.ch + start.length);
						editor.focus();
					}

					for (var i=0; i<cmToolbarVars.length; i++) {
						var t = cmToolbarVars[i];
						var t3 = t[3] ? ('data-prompt="'+t[3]+'"') : '';
						cmToolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_'+t[0]+'" data-start=\''+t[1]+'\' data-end=\''+t[2]+'\' '+t3+' class="ed_button cm_ed_button" value="'+t[0]+'">');
						document.getElementById('cm_content_'+t[0]).onclick = cmToolbarClick;
					}
					cmToolbar.setAttribute("data-updated", "1");
				}
				/* end buttons */
			}

			window.onload = function() {
				runEditorHighlighter("content");
			}
		</script>
		<?php
	}

	public function admin_head(){
		if (!$this->is_editor())
			return;
		?>
				<link rel="stylesheet" href="<?php echo HESH_LIBS; ?>codemirror.min.css">
				<script src="<?php echo HESH_LIBS; ?>codemirror-compressed.js"></script>
				<style>
					.CodeMirror-scroll {resize:vertical;}
					.wp-editor-area,
					.wp-fullscreen-both,
					#content-resize-handle,
					.quicktags-toolbar input.ed_button {display: none !important;}
					.quicktags-toolbar input#qt_content_fullscreen, #ed_toolbar input.cm_ed_button {display: inline-block !important;}
					
					.CodeMirror-matchingbracket {background-color: #fff490; color: inherit !important;}
					.CodeMirror {font-family: Menlo Regular,Consolas,Monaco,monospace;line-height: 150%;font-size: 12px; height: 600px;}

					#wp-fullscreen-container .CodeMirror {height: auto; min-height: 600px;}
					#wp-fullscreen-container .CodeMirror-scroll {overflow-y: hidden; overflow-x: auto;}
					#wp-fullscreen-wrap {width: 80% !important;}
					#wp-fullscreen-container {padding-bottom: 4px !important;}
				</style>
		<?php

	}
	
	private function is_editor(){
		if (!strstr($_SERVER['SCRIPT_NAME'],'post.php') && !strstr($_SERVER['SCRIPT_NAME'],'post-new.php')) {
			return false;
		}
		return true;
	}
}

if (is_admin())
	$hesh = new wp_html_editor_syntax();
?>
