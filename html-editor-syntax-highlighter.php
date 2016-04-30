<?php
/**
 * Plugin Name:        HTML Editor Syntax Highlighter - DEV
 * Plugin URI:         http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description:        Syntax Highlighting in WordPress HTML Editor
 * Text Domain:        html-editor-syntax-highlighter
 * Author:             Petr Mukhortov
 * Author URI:         http://mukhortov.com/
 * Version:            1.6.10
 * Requires at least:  3.3
 * Tested up to:       4.3.1
 * Stable tag:         1.6.10
 * GitHub Plugin URI:  https://github.com/arniebradfo/HESH-WordPress-Plugin
 * GitHub Branch:      master
 **/

if(preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) {
	die('You are not allowed to call this page directly.');
}

define('HESH_LIBS', plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {
	public function __construct() {
		add_action('admin_enqueue_scripts' , array(&$this,'admin_enqueue_scripts'));
	}
	public function admin_enqueue_scripts() {
		if (!$this->is_editor())
			return;
		wp_enqueue_style('heshcss', HESH_LIBS.'hesh.min.css');
		wp_enqueue_script('heshjs', HESH_LIBS.'hesh.js', array(), false, true);
	}
	private function is_editor(){
		if (!strstr($_SERVER['SCRIPT_NAME'], 'post.php') && !strstr($_SERVER['SCRIPT_NAME'], 'post-new.php')) {
			return false;
		}
		return true;
	}
}

if (is_admin()) {
	$hesh = new wp_html_editor_syntax();
}
?>
