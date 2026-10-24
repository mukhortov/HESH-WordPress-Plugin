<?php
/**
 * Loads the editor on the post edit screens.
 *
 * @package HESH_plugin
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the block editor or the Classic editor build, whichever the
 * screen uses. The theme and plugin file editors keep core's own editor.
 */
class HESH_Assets {

	/**
	 * Enqueues the scripts and styles, on `admin_enqueue_scripts`.
	 *
	 * @param string $hook_suffix The current admin page.
	 */
	public static function enqueue( $hook_suffix ) {
		if ( 'post.php' !== $hook_suffix && 'post-new.php' !== $hook_suffix ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || ! post_type_supports( $screen->post_type, 'editor' ) ) {
			return;
		}

		$entry      = $screen->is_block_editor() ? 'block-editor' : 'classic-editor';
		$asset_file = HESH_DIR . "build/{$entry}.asset.php";
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset  = require $asset_file;
		$handle = "hesh-{$entry}";
		$url    = plugins_url( "build/{$entry}", HESH_FILE );

		wp_enqueue_script( $handle, "{$url}.js", $asset['dependencies'], $asset['version'], true );
		wp_set_script_translations( $handle, 'html-editor-syntax-highlighter' );
		wp_enqueue_style( $handle, "{$url}.css", array( 'wp-components' ), $asset['version'] );
		wp_style_add_data( $handle, 'rtl', 'replace' );

		$post   = get_post();
		$config = array(
			'settings' => HESH_Settings::get( get_current_user_id() ),
			'postId'   => $post ? $post->ID : 0,
		);
		wp_add_inline_script( $handle, 'window.heshConfig = ' . wp_json_encode( $config ) . ';', 'before' );
	}
}
