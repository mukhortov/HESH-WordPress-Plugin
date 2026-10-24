<?php
/**
 * Test helpers, loaded only in the end-to-end test site.
 *
 * @package HESH_plugin
 */

// Stay on the WordPress version under test: new sites have major core
// updates switched on, and WP-Cron would update the site mid-run.
add_filter( 'automatic_updater_disabled', '__return_true' );

// The admin is always logged in. The cookies are also set for the current
// request, which auth_redirect() checks before anything else runs. (The auth
// cookie is only sent to /wp-admin, the logged-in cookie everywhere.)
add_action(
	'plugins_loaded',
	function () {
		if ( wp_validate_auth_cookie( '', 'logged_in' ) ) {
			return;
		}
		add_action(
			'set_auth_cookie',
			function ( $cookie ) {
				$_COOKIE[ AUTH_COOKIE ] = $cookie;
			}
		);
		add_action(
			'set_logged_in_cookie',
			function ( $cookie ) {
				$_COOKIE[ LOGGED_IN_COOKIE ] = $cookie;
			}
		);
		wp_set_auth_cookie( 1, true );
	},
	1
);

// No block editor welcome guides (post and template): they open over the editor on a new site.
add_action(
	'init',
	function () {
		$key         = $GLOBALS['wpdb']->get_blog_prefix() . 'persisted_preferences';
		$preferences = get_user_meta( 1, $key, true );
		$preferences = is_array( $preferences ) ? $preferences : array();
		$changed     = false;
		// the post editor's scope, and the shared one newer versions use
		foreach ( array( 'core/edit-post', 'core' ) as $scope ) {
			foreach ( array( 'welcomeGuide', 'welcomeGuideTemplate' ) as $guide ) {
				if ( ! isset( $preferences[ $scope ][ $guide ] ) || false !== $preferences[ $scope ][ $guide ] ) {
					$preferences[ $scope ][ $guide ] = false;
					$changed                         = true;
				}
			}
		}
		if ( $changed ) {
			$preferences['_modified'] = gmdate( 'c' );
			update_user_meta( 1, $key, $preferences );
		}
	}
);

// Pages use the Classic editor, like with the Classic Editor plugin; posts use the block editor.
add_filter(
	'use_block_editor_for_post_type',
	function ( $use_block_editor, $post_type ) {
		return 'page' === $post_type ? false : $use_block_editor;
	},
	10,
	2
);

add_action(
	'rest_api_init',
	function () {
		$can = function () {
			return current_user_can( 'edit_posts' );
		};

		// the user a request is about: ?user=<id>, or the current user
		$user = function ( WP_REST_Request $request ) {
			return $request['user'] ? (int) $request['user'] : get_current_user_id();
		};

		// Replaces the user's settings with 2.x settings (any hesh_<key> meta), to test the migration.
		register_rest_route(
			'hesh-e2e/v1',
			'/legacy-settings',
			array(
				'methods'             => 'POST',
				'permission_callback' => $can,
				'callback'            => function ( WP_REST_Request $request ) use ( $user ) {
					$user_id = $user( $request );
					delete_user_meta( $user_id, 'hesh_settings' );
					foreach ( $request->get_json_params() as $key => $value ) {
						update_user_meta( $user_id, 'hesh_' . $key, $value );
					}
					return array( 'ok' => true );
				},
			)
		);

		// Runs the plugin's uninstall.php the way WordPress does when the plugin is deleted.
		register_rest_route(
			'hesh-e2e/v1',
			'/uninstall',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'delete_plugins' );
				},
				'callback'            => function () {
					define( 'WP_UNINSTALL_PLUGIN', 'html-editor-syntax-highlighter/html-editor-syntax-highlighter.php' );
					include WP_PLUGIN_DIR . '/html-editor-syntax-highlighter/uninstall.php';
					return array( 'ok' => true );
				},
			)
		);

		// All of the user's hesh_* meta, and the WordPress version.
		register_rest_route(
			'hesh-e2e/v1',
			'/state',
			array(
				'methods'             => 'GET',
				'permission_callback' => $can,
				'callback'            => function ( WP_REST_Request $request ) use ( $user ) {
					$meta = array();
					foreach ( get_user_meta( $user( $request ) ) as $key => $values ) {
						if ( 0 === strpos( $key, 'hesh_' ) ) {
							$meta[ $key ] = maybe_unserialize( $values[0] );
						}
					}
					return array(
						'meta'      => $meta,
						'wpVersion' => get_bloginfo( 'version' ),
						'phpVersion' => PHP_VERSION,
					);
				},
			)
		);
	}
);
