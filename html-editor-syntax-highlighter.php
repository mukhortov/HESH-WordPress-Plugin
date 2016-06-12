<?php
/**
 *
 * @since              1.7.1
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
 * Version:            1.7.1
 * Requires at least:  3.3
 * Tested up to:       4.5.2
 * Stable tag:         1.7.1
 **/

if (preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) {
	die('You are not allowed to call this page directly.');
}

define('HESH_LIBS', plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {

	public function __construct () {
		if (!self::is_editor()) return;
		add_action('admin_enqueue_scripts', array(&$this, 'admin_enqueue_scripts'));
	}

	// Enqueues scripts and styles for hesh.js
	public function admin_enqueue_scripts () {
		wp_enqueue_style('codemirror', HESH_LIBS.'codemirror.min.css', false, self::version());
		wp_enqueue_style('heshcss', HESH_LIBS.'hesh.min.css', false, self::version());
		wp_register_script('codemirror', HESH_LIBS.'codemirror.min.js', false, self::version(), true);
		wp_enqueue_script('codemirror');
		wp_register_script('heshjs', HESH_LIBS.'hesh.min.js', array('codemirror'), self::version(), true); // 'tiny_mce' dependency doesn't work?!
		wp_enqueue_script('heshjs');
	}

	// returns whether or not the current page is a post editing admin page
	private function is_editor () {
		if (!strstr($_SERVER['SCRIPT_NAME'], 'post.php') &&
			!strstr($_SERVER['SCRIPT_NAME'], 'post-new.php'))
			return false;
		return true;
	}

	// returns the current version of the plugin
	// this will be appended to the end of the js and css files for cache-busting purposes
	private function version () {
		return get_plugin_data( __FILE__ )['Version'];
	}

}

if (is_admin()) {
	$hesh = new wp_html_editor_syntax();
}

?>
