<?php
/**
 *
 * @since              1.7.2
 * @package            HESH_plugin
 *
 * Plugin Name:        HTML Editor Syntax Highlighter - DEV
 * Plugin URI:         http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description:        Adds syntax highlighting in the WordPress post HTML/text editor using Codemirror.js
 * Text Domain:        html-editor-syntax-highlighter
 * Author:             James Bradford
 * Author URI:         http://arniebradfo.com/
 * Author:             Petr Mukhortov
 * Author URI:         http://mukhortov.com/
 * License:            GPL-2.0+
 * License URI:        http://www.gnu.org/licenses/gpl-2.0.txt
 * GitHub Branch:      master
 * GitHub Plugin URI:  https://github.com/mukhortov/HESH-WordPress-Plugin
 * Version:            2.0.0
 * Requires at least:  4.0.11
 * Tested up to:       4.5.2
 * Stable tag:         1.7.2
 **/

if ( preg_match( '#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'] ) ) {
	die('You are not allowed to call this page directly.');
}

define( 'HESH_LIBS', plugins_url( '/dist/', __FILE__ ) );

class wp_html_editor_syntax {

	public function __construct () {
		add_action( 'admin_enqueue_scripts', array(&$this, 'admin_enqueue_scripts' ) );
	}

	// Enqueues scripts and styles for hesh.js
	public function admin_enqueue_scripts () {

		if (!strstr($_SERVER['SCRIPT_NAME'], 'post.php') &&
			!strstr($_SERVER['SCRIPT_NAME'], 'post-new.php')) return;

		$plugData = get_plugin_data( __FILE__ ); // need this temporary var to support versions of php < 5.4
		$ver = $plugData['Version'];

		wp_enqueue_style( 'codemirror', HESH_LIBS.'codemirror.css', false, $ver );
		wp_enqueue_style( 'material', HESH_LIBS.'material.css', false, $ver );
		wp_enqueue_style( 'heshcss', HESH_LIBS.'hesh.css', false, $ver );

		wp_enqueue_script( 'codemirror', HESH_LIBS.'codemirror.js', false, $ver, true );
		wp_enqueue_script( 'xml', HESH_LIBS.'xml.js', false, $ver, true );
		wp_enqueue_script( 'javascript', HESH_LIBS.'javascript.js', false, $ver, true );
		wp_enqueue_script( 'css', HESH_LIBS.'css.js', false, $ver, true );
		wp_enqueue_script( 'htmlmixed', HESH_LIBS.'htmlmixed.js', array('codemirror', 'css', 'javascript', 'xml'), $ver, true );
		wp_enqueue_script( 'shortcode', HESH_LIBS.'shortcode.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'wordpresspost', HESH_LIBS.'wordpresspost.js', array('codemirror', 'htmlmixed', 'shortcode'), $ver, true );
		wp_enqueue_script( 'heshjs', HESH_LIBS.'hesh.js', array('codemirror'), $ver, true );

	}

}

if ( is_admin() ) {
	$hesh = new wp_html_editor_syntax();
}

?>
