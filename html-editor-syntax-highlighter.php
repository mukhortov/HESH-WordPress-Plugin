<?php
/**
 *
 * @since              1.0.0
 * @package            HESH_plugin
 *
 * Plugin Name:        HTML Editor Syntax Highlighter - DEV
 * Plugin URI:         http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description:        Adds syntax highlighting in the WordPress post HTML/text editor using Codemirror.js
 * Text Domain:        html-editor-syntax-highlighter
 * Author:             Petr Mukhortov
 * Author URI:         http://mukhortov.com/
 * Author:             James Bradford
 * Author URI:         http://arniebradfo.com/
 * License:            GPL-2.0+
 * License URI:        http://www.gnu.org/licenses/gpl-2.0.txt
 * GitHub Branch:      master
 * GitHub Plugin URI:  https://github.com/arniebradfo/HESH-WordPress-Plugin
 * Version:            1.6.10
 * Requires at least:  3.3
 * Tested up to:       4.3.1
 * Stable tag:         1.6.10
 **/

if (preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) {
	die('You are not allowed to call this page directly.');
}

define('HESH_LIBS', plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {

	public function __construct () {
		if (!$this->is_editor()) return;
		add_action('admin_enqueue_scripts', array(&$this, 'admin_enqueue_scripts'));
		add_action('after_wp_tiny_mce', array(&$this, 'custom_after_wp_tiny_mce'));
	}

	/**
	 * Enqueues scripts for
	 * hesh.js cannot be loaded here becasue it is dependent on TinyMCE
	 */
	public function admin_enqueue_scripts () {
		// TODO: Split CodeMirror into its ownfile and enqueue it seperately
		wp_enqueue_style('heshcss', HESH_LIBS.'hesh.min.css');
		// wp_enqueue_script('heshjs', HESH_LIBS.'hesh.js', array('editor'), false, true); // tiny_mce dependency doesn't work?!
	}

	/**
	 * Adds scripts dependent on TinyMCE
	 * @link http://wordpress.stackexchange.com/questions/76195/enqueue-script-after-tinymce-initialized
	 */
	public function custom_after_wp_tiny_mce () {
		print('<script type="text/javascript" src="'.HESH_LIBS.'hesh.js"></script>');
	}

	/**
	 * returns whether or not the current page is a post editing admin page
	 */
	private function is_editor () {
		if (!strstr($_SERVER['SCRIPT_NAME'], 'post.php') &&
			!strstr($_SERVER['SCRIPT_NAME'], 'post-new.php'))
			return false;
		return true;
	}

}

if (is_admin()) {
	$hesh = new wp_html_editor_syntax();
}

?>
