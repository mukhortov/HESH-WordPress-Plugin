<?php
/**
 *
 * @since              1.7.2
 * @package            HESH_plugin
 *
 * Plugin Name:        HTML Editor Syntax Highlighter
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
 * GitHub Plugin URI:  https://github.com/mukhortov/HESH-WordPress-Plugin
 * Version:            1.7.2
 * Requires at least:  4.0.11
 * Tested up to:       4.5.2
 * Stable tag:         1.7.2
 **/

if ( preg_match( '#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'] ) ) {
	die('You are not allowed to call this page directly.');
}

define( 'HESH_LIBS', plugins_url( '/lib/', __FILE__ ) );

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

		wp_enqueue_style( 'codemirror', HESH_LIBS.'codemirror.min.css', false, $ver );

		wp_enqueue_style( 'heshcss', HESH_LIBS.'hesh.min.css', false, $ver );

		wp_register_script( 'codemirror', HESH_LIBS.'codemirror.min.js', false, $ver, true );
		wp_enqueue_script( 'codemirror' );

		wp_register_script( 'heshjs', HESH_LIBS.'hesh.min.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'heshjs' );

	}

}

if (is_admin()) {
	$hesh = new wp_html_editor_syntax();
}

?>
