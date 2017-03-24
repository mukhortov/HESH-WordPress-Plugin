<?php
/**
 * Plugin Name: HTML Editor Syntax Highlighter
 * Plugin URI: http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description: Syntax Highlighting in WordPress HTML Editor
 * Author: Petr Mukhortov
 * Author URI: http://mukhortov.com/
 * Version: 1.6.0
 * Requires at least: 3.3
 * Tested up to: 3.9.1
 * Stable tag: 1.6.0
 **/

if(preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) { die('You are not allowed to call this page directly.'); }

define('HESH_LIBS',plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {
	public function __construct(){
		add_action('admin_head',array(&$this,'admin_head'));
		add_action('admin_footer',array(&$this,'admin_footer'));
	}
	public function admin_head(){
		if (!$this->is_editor())
			return;
		?>
		<link rel="stylesheet" href="<?php echo HESH_LIBS; ?>hesh.min.css">
		<?php
	}
	public function admin_footer(){
		if (!$this->is_editor())
			return;
		?>
		<script src="<?php echo HESH_LIBS; ?>hesh.min.js"></script>
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
