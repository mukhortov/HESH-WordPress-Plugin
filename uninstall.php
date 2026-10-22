<?php
/**
 * Removes every user's editor settings when the plugin is deleted.
 *
 * @package HESH_plugin
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_metadata( 'user', 0, 'hesh_settings', '', true );

// 2.x settings of users who never opened the editor after updating
foreach ( array( 'theme', 'tabSize', 'lineWrapping', 'lineNumbers', 'fontSize', 'lineHeight', 'matchBrackets', 'matchTags', 'highlightSelectionMatches', 'autoCloseTags', 'autoCloseBrackets', 'foldGutter', 'scrollbarStyle', 'keyMap' ) as $hesh_key ) {
	delete_metadata( 'user', 0, 'hesh_' . $hesh_key, '', true );
}
