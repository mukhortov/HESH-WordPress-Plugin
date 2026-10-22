<?php
/**
 * Per-user editor settings, stored in the `hesh_settings` user meta.
 *
 * @package HESH_plugin
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the settings meta for the REST API, where the editor saves it
 * (`POST /wp/v2/users/me`), and moves 2.x settings into it.
 */
class HESH_Settings {

	const META_KEY = 'hesh_settings';

	/**
	 * Settings 2.x kept in one user meta each, `hesh_<name>`.
	 */
	const LEGACY_KEYS = array(
		'theme',
		'tabSize',
		'lineWrapping',
		'lineNumbers',
		'fontSize',
		'lineHeight',
		'matchBrackets',
		'matchTags',
		'highlightSelectionMatches',
		'autoCloseTags',
		'autoCloseBrackets',
		'foldGutter',
		'scrollbarStyle',
		'keyMap',
	);

	/**
	 * 2.x CodeMirror 5 themes that have a 3.0 counterpart. Other light themes
	 * become `default`, other dark themes the `wordpress` theme.
	 */
	const LEGACY_THEMES = array(
		'wordpress'          => 'wordpress',
		'default'            => 'default',
		'none'               => 'default',
		'dracula'            => 'dracula',
		'monokai'            => 'monokai',
		'nord'               => 'nord',
		'eclipse'            => 'eclipse',
		'gruvbox-dark'       => 'gruvbox-dark',
		'github'             => 'github-light',
		'solarized'          => 'solarized-light',
		'material'           => 'material-dark',
		'material-darker'    => 'material-dark',
		'material-ocean'     => 'material-dark',
		'material-palenight' => 'material-dark',
	);

	const LEGACY_LIGHT_THEMES = array(
		'3024-day',
		'base16-light',
		'duotone-light',
		'elegant',
		'idea',
		'juejin',
		'mdn-like',
		'neat',
		'neo',
		'paraiso-light',
		'ssms',
		'ttcn',
		'xq-light',
		'yeti',
	);

	/**
	 * The JSON schema shared with the JavaScript settings.
	 *
	 * @var array|null
	 */
	private static $schema = null;

	/**
	 * Settings schema from includes/settings-schema.json.
	 *
	 * @return array
	 */
	public static function schema() {
		if ( null === self::$schema ) {
			$schema = wp_json_file_decode( HESH_DIR . 'includes/settings-schema.json', array( 'associative' => true ) );
			unset( $schema['$schema'], $schema['title'] );
			self::$schema = $schema;
		}
		return self::$schema;
	}

	/**
	 * Default value of every setting.
	 *
	 * @return array
	 */
	public static function defaults() {
		return wp_list_pluck( self::schema()['properties'], 'default' );
	}

	/**
	 * Registers the user meta, on `init`.
	 */
	public static function register() {
		register_meta(
			'user',
			self::META_KEY,
			array(
				'type'              => 'object',
				'description'       => __( 'Code editor settings for HTML Editor Syntax Highlighter.', 'html-editor-syntax-highlighter' ),
				'single'            => true,
				'default'           => self::defaults(),
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'auth_callback'     => array( __CLASS__, 'can_edit' ),
				'show_in_rest'      => array(
					// only in responses to the user editing their profile, not in public author data
					'schema' => array_merge( self::schema(), array( 'context' => array( 'edit' ) ) ),
				),
			)
		);
	}

	/**
	 * Users can change their own settings, and administrators anyone's.
	 *
	 * @param bool $allowed   Whether the user can edit the meta.
	 * @param string $meta_key  Meta key.
	 * @param int  $object_id ID of the user the meta belongs to.
	 * @return bool
	 */
	public static function can_edit( $allowed, $meta_key, $object_id ) {
		return current_user_can( 'edit_user', $object_id );
	}

	/**
	 * Valid settings from any value: unknown keys are dropped, and missing or
	 * invalid values replaced with the default.
	 *
	 * @param mixed $value Settings to check.
	 * @return array
	 */
	public static function sanitize( $value ) {
		$settings = self::defaults();
		if ( ! is_array( $value ) ) {
			return $settings;
		}
		foreach ( self::schema()['properties'] as $key => $property ) {
			if ( ! array_key_exists( $key, $value ) ) {
				continue;
			}
			if ( true === rest_validate_value_from_schema( $value[ $key ], $property, $key ) ) {
				$settings[ $key ] = rest_sanitize_value_from_schema( $value[ $key ], $property, $key );
			}
		}
		return $settings;
	}

	/**
	 * Settings of a user, moving their 2.x settings over the first time.
	 *
	 * @param int $user_id User ID.
	 * @return array
	 */
	public static function get( $user_id ) {
		if ( ! metadata_exists( 'user', $user_id, self::META_KEY ) ) {
			self::migrate( $user_id );
		}
		return self::sanitize( get_user_meta( $user_id, self::META_KEY, true ) );
	}

	/**
	 * Moves the 2.x `hesh_*` user meta into `hesh_settings`, then deletes it.
	 *
	 * @param int $user_id User ID.
	 */
	public static function migrate( $user_id ) {
		$legacy = array();
		foreach ( self::LEGACY_KEYS as $key ) {
			if ( metadata_exists( 'user', $user_id, 'hesh_' . $key ) ) {
				$legacy[ $key ] = get_user_meta( $user_id, 'hesh_' . $key, true );
			}
		}
		if ( ! $legacy ) {
			return;
		}

		update_user_meta( $user_id, self::META_KEY, self::from_legacy( $legacy ) );
		foreach ( array_keys( $legacy ) as $key ) {
			delete_user_meta( $user_id, 'hesh_' . $key );
		}
	}

	/**
	 * Converts 2.x settings, as stored, to 3.0 settings.
	 *
	 * @param array $legacy Stored 2.x values by setting name.
	 * @return array
	 */
	public static function from_legacy( $legacy ) {
		$settings = array();
		// 2.x stored `false` as an empty string
		$boolean = function ( $value ) {
			return is_bool( $value ) ? $value : in_array( (string) $value, array( '1', 'true' ), true );
		};

		foreach ( array( 'lineWrapping', 'lineNumbers', 'foldGutter', 'matchBrackets', 'highlightSelectionMatches', 'autoCloseTags', 'autoCloseBrackets' ) as $key ) {
			if ( isset( $legacy[ $key ] ) ) {
				$settings[ $key ] = $boolean( $legacy[ $key ] );
			}
		}
		// bracket matching highlights matching tags too now
		if ( isset( $legacy['matchTags'] ) && $boolean( $legacy['matchTags'] ) ) {
			$settings['matchBrackets'] = true;
		}

		foreach ( array( 'tabSize', 'fontSize' ) as $key ) {
			if ( isset( $legacy[ $key ] ) && is_numeric( $legacy[ $key ] ) ) {
				$settings[ $key ] = (int) $legacy[ $key ];
			}
		}
		if ( isset( $legacy['lineHeight'] ) && is_numeric( $legacy['lineHeight'] ) ) {
			$settings['lineHeight'] = (float) $legacy['lineHeight'];
		}

		if ( isset( $legacy['theme'] ) ) {
			$theme = (string) $legacy['theme'];
			if ( isset( self::LEGACY_THEMES[ $theme ] ) ) {
				$settings['theme'] = self::LEGACY_THEMES[ $theme ];
			} else {
				$settings['theme'] = in_array( $theme, self::LEGACY_LIGHT_THEMES, true ) ? 'default' : 'wordpress';
			}
		}

		if ( isset( $legacy['keyMap'] ) ) {
			// the VS Code bindings replace the Sublime Text ones
			$settings['keyMap'] = 'sublime' === $legacy['keyMap'] ? 'vscode' : (string) $legacy['keyMap'];
		}

		return self::sanitize( $settings );
	}
}
