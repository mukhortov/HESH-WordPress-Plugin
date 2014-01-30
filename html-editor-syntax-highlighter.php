<?php
/**
 * Plugin Name: HTML Editor Syntax Highlighter
 * Plugin URI: http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description: Syntax Highlighting in WordPress HTML Editor
 * Author: Petr Mukhortov
 * Author URI: http://mukhortov.com/
 * Author: Joe Motacek
 * Version: 1.4.6
 * Requires at least: 3.3
 * Tested up to: 3.8
 * Stable tag: 1.4.5
 **/

if(preg_match('#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'])) { die('You are not allowed to call this page directly.'); }

define('HESH_LIBS',plugins_url('/lib/',__FILE__));

class wp_html_editor_syntax {
	public function __construct(){
		add_action('admin_head',array(&$this,'admin_head'));
		add_action('admin_footer',array(&$this,'admin_footer'));
		//Adding extra user profile fields so users can define which theme they want
		add_action( 'show_user_profile', array(&$this, 'add_user_profile_field' ) );
		add_action( 'edit_user_profile', array(&$this, 'add_user_profile_field' ) );
		add_action( 'personal_options_update', array(&$this, 'save_user_profile_field' ) );
		add_action( 'edit_user_profile_update', array(&$this, 'save_user_profile_field' ) );
	}
	public function admin_head(){
		if (!$this->is_editor())
			return;
			
		$current_user = wp_get_current_user();
		$theme = esc_attr( get_the_author_meta('hesh-theme', $current_user->ID) );
		if($theme == "solarized"):
		?>
			<link rel="stylesheet" href="<?php echo HESH_LIBS; ?>moto.min.css">
		<?php
		else:
		?>
			<link rel="stylesheet" href="<?php echo HESH_LIBS; ?>hesh.min.css">
		<?php
		endif;
		?>
		<!--[if lte IE 8]>
			<style>
				/* Fixing problems with hidden Textarea in IE */
				#content {
					display: block!important;
					position: absolute;
					left: -9000px;
				}
			</style>
		<![endif]-->
		<?php
	}
	public function admin_footer(){
		if (!$this->is_editor())
			return;
		?>
		<script src="<?php echo HESH_LIBS; ?>hesh.min.js"></script>
		<?php
	}
	private function is_editor(){
		if (!strstr($_SERVER['SCRIPT_NAME'],'post.php') && !strstr($_SERVER['SCRIPT_NAME'],'post-new.php')) {
			return false;
		}
		return true;
	}
	public function add_user_profile_field( $user ) { 
		?>
		<h3><?php _e("HTML Editor Syntax Highlighter", "blank"); ?></h3>
		<table class="form-table">
			<tr>
				<th><label for="theme"><?php _e("Editor Theme"); ?></label></th>
				<td>
					<select name="theme" id="theme">
						<option value="default" <?php ( esc_attr( get_the_author_meta('hesh-theme', $user->ID) ) == 'default' ? 'selected' : '' );?>>Default</option>
						<option value="solarized" <?php ( esc_attr( get_the_author_meta('hesh-theme', $user->ID) ) == 'solarized' ? 'selected' : '' );?>>Solarized</option>
					</select><br />
					<span class="description"><?php _e("Select a Color Theme"); ?></span>
				</td>
			</tr>
		</table>
		<?php
	}
	public function save_user_profile_field( $user_id ) {
		if ( !current_user_can( 'edit_user', $user_id ) ) { return false; }

		update_user_meta( $user_id, 'hesh-theme', $_POST['theme'] );
	}
	
}

if (is_admin())
	$hesh = new wp_html_editor_syntax();
?>