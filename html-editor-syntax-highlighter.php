<?php
/**
 * Plugin Name:        HTML Editor Syntax Highlighter !DEV!
 * Plugin URI:         https://wordpress.org/plugins/html-editor-syntax-highlighter/
 * Description:        Syntax highlighting for the Classic editor's Text tab and the block editor's Code Editor, using CodeMirror.
 * Author:             Peter Mukhortov, James Bradford
 * Author URI:         https://github.com/mukhortov/HESH-WordPress-Plugin
 * Version:            3.0.0-dev
 * Requires at least:  6.5
 * Requires PHP:       7.4
 * License:            GPLv2 or later
 * License URI:        https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:        html-editor-syntax-highlighter
 *
 * @package            HESH_plugin
 */

defined( 'ABSPATH' ) || exit;

define( 'HESH_VERSION', '3.0.0-dev' );
define( 'HESH_FILE', __FILE__ );
define( 'HESH_DIR', plugin_dir_path( __FILE__ ) );

require_once HESH_DIR . 'includes/class-hesh-settings.php';
require_once HESH_DIR . 'includes/class-hesh-assets.php';

add_action( 'rest_api_init', array( 'HESH_Settings', 'register' ) );
add_action( 'admin_init', array( 'HESH_Settings', 'register' ) );

if ( is_admin() ) {
	add_action( 'admin_enqueue_scripts', array( 'HESH_Assets', 'enqueue' ) );
}
