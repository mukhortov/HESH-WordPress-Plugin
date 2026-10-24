<?php
/**
 * Removes every user's editor settings when the plugin is deleted.
 *
 * @package HESH_plugin
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-hesh-settings.php';

delete_metadata( 'user', 0, HESH_Settings::META_KEY, '', true );

// 2.x settings, and the 2.x survey notice state, of users who never opened the editor after updating
foreach ( array_merge( HESH_Settings::LEGACY_KEYS, HESH_Settings::OBSOLETE_KEYS ) as $hesh_key ) {
	delete_metadata( 'user', 0, 'hesh_' . $hesh_key, '', true );
}
