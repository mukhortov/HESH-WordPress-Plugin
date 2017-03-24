<?php
/**
 * Plugin Name: HTML Editor Syntax Highlighter
 * Plugin URI: http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description: Syntax Highlighting in WordPress HTML Editor
 * Author: Peter Mukhortov
 * Author URI: http://mukhortov.com/
 * Version: 1.3.0
 * Requires at least: 3.3
 * Tested up to: 3.5.1
 * Stable tag: 1.3.0
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

				//fix
				var visualEditorEnabled;

				if (document.getElementById("content-tmce") != null) {
					visualEditorEnabled = true;
				} else {
					visualEditorEnabled = false;
				}

				if (visualEditorEnabled) {
					switchEditors.switchto(document.getElementById("content-html"));
				}
				// end fix

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
				cmPostID = document.getElementById("post_ID").value;
				editor.on("cursorActivity", function(){
					curPos = editor.getCursor();
					window.name = cmPostID+','+curPos.line+','+curPos.ch;
				});
				//Restoring cursor state
				curPos = window.name.split(',');
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
				//Villeman og Magnhild

				if (!cmToolbar.getAttribute('data-updated')) {
					cmToolbarVars = [
						//['search','','','Search:'],
						['more','<!--more-->',''],
						['comment','<!--','-->'],
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

					]
					for (var i=0; i<cmToolbarVars.length; i++) {
						t = cmToolbarVars[i];
						t3 = t[3] ? ('data-prompt="'+t[3]+'"') : '';
						cmToolbar.insertAdjacentHTML('afterbegin', '<input type="button" id="cm_content_'+t[0]+'" data-start=\''+t[1]+'\' data-end=\''+t[2]+'\' '+t3+' class="ed_button cm_ed_button" value="'+t[0]+'">');
						document.getElementById('cm_content_'+t[0]).onclick = function (e) {
							var range = { from: editor.getCursor(true), to: editor.getCursor(false) }, selStart = editor.getCursor("start");
							var start = this.getAttribute('data-start');
							var end = this.getAttribute('data-end');
							var cmPrompt = this.getAttribute('data-prompt');
							var selText = editor.getSelection();
							if (cmPrompt) start = start.replace('$',prompt(cmPrompt, ''));
							editor.replaceSelection(start+selText+end, range.from, range.to);
							editor.setSelection(selStart, editor.getCursor("end"));
							editor.setCursor(range.from.line,range.from.ch+start.length);
							editor.focus();
						}
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
	/*public function admin_init(){
		wp_enqueue_script('jquery');	// For AJAX code submissions
		wp_enqueue_script('jquery-ui-core');
		wp_enqueue_script('jquery-ui-widget');
		wp_enqueue_script('jquery-ui-mouse');
		wp_enqueue_script('jquery-ui-resizable');
	}*/
	public function admin_head(){
		if (!$this->is_editor())
			return;
		?>
				<link rel="stylesheet" href="<?php echo HESH_LIBS; ?>codemirror.css">
				<script src="<?php echo HESH_LIBS; ?>codemirror.js"></script>
				<script src="<?php echo HESH_LIBS; ?>xml.js"></script>
				<script src="<?php echo HESH_LIBS; ?>javascript.js"></script>
				<script src="<?php echo HESH_LIBS; ?>css.js"></script>
				<script src="<?php echo HESH_LIBS; ?>htmlmixed.js"></script>
				<script src="<?php echo HESH_LIBS; ?>util/active-line.js"></script>
				<script src="<?php echo HESH_LIBS; ?>util/formatting.js"></script>
				<style>
					.CodeMirror-scroll {resize:vertical;}
					.wp-editor-area,
					.wp-fullscreen-both,
					#content-resize-handle,
					.quicktags-toolbar input.ed_button {display: none !important;}
					.quicktags-toolbar input#qt_content_fullscreen, #ed_toolbar input.cm_ed_button {display: inline-block !important;}

					#wp-fullscreen-container .CodeMirror {height: auto; min-height: 400px;}
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
