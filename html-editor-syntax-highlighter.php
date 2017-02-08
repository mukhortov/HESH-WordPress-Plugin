<?php


/**
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
		add_action( 'wp_ajax_hesh_options_form', array(&$this, 'hesh_options_form_process'));
		add_action( 'admin_footer', array(&$this, 'hesh_print_form') );
	}
	
	// Enqueues scripts and styles for hesh.js
	public function admin_enqueue_scripts () {
		
		if (!strstr($_SERVER['SCRIPT_NAME'], 'post.php') && !strstr($_SERVER['SCRIPT_NAME'], 'post-new.php')) return;
		
		$plugData = get_plugin_data( __FILE__ );
		// need this temporary var to support versions of php < 5.4
		$ver = $plugData['Version'];
		
		wp_enqueue_style( 'codemirror', HESH_LIBS.'codemirror.css', false, $ver );
		wp_enqueue_style( 'material', HESH_LIBS.'material.css', false, $ver );
		wp_enqueue_style( 'heshcss', HESH_LIBS.'hesh.css', false, $ver );
		
		wp_enqueue_script( 'codemirror', HESH_LIBS.'codemirror.js', false, $ver, true );
		wp_enqueue_script( 'xml_cm', HESH_LIBS.'xml.js', false, $ver, true );
		wp_enqueue_script( 'javascript_cm', HESH_LIBS.'javascript.js', false, $ver, true );
		wp_enqueue_script( 'css_cm', HESH_LIBS.'css.js', false, $ver, true );
		wp_enqueue_script( 'htmlmixed_cm', HESH_LIBS.'htmlmixed.js', array('codemirror', 'css_cm', 'javascript_cm', 'xml_cm'), $ver, true );
		wp_enqueue_script( 'shortcode_cm', HESH_LIBS.'shortcode.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'wordpresspost_cm', HESH_LIBS.'wordpresspost.js', array('codemirror', 'htmlmixed_cm', 'shortcode_cm'), $ver, true );
		
		wp_enqueue_script( 'jquery');
		wp_enqueue_script( 'heshjs', HESH_LIBS.'hesh.js', array('codemirror', 'jquery'), $ver, true );
		
		update_user_meta( get_current_user_id(), 'hesh_theme', 'material');
		$metaTheme = get_user_meta( get_current_user_id(), 'hesh_theme' );

		wp_localize_script(
			'heshjs', // i think... // the handle for the js // the_unique_name_for_your_js
			'heshOptions', // theUniqueNameForYourJSObject
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ), // url for php file that process ajax request to WP
				'nonce' => wp_create_nonce( 'hesh_options_form' ), // this is a unique token to prevent form hijacking
				'theme' => $metaTheme // I will add the user options here
			)
		);
		
	}
	
	// 	AJAX forms
	// 	https://teamtreehouse.com/community/submitting-a-form-in-wordpress-using-ajax
	// 	http://wordpress.stackexchange.com/questions/60758/how-to-handle-form-submission
	
    private function write_log ( $log )  {
        if ( true === WP_DEBUG ) {
            if ( is_array( $log ) || is_object( $log ) ) {
                error_log( print_r( $log, true ) );
            } else {
                error_log( $log );
            }
        }
    }
	
	public function hesh_options_form_process() {
		error_log( print_r( $_POST, true ) );
		// 	process user settings
		// 	https://developer.wordpress.org/plugins/users/working-with-user-metadata/
		// 	https://codex.wordpress.org/Function_Reference/update_user_meta
		# add user meta
	}
	
	private function output_select_element($config) {
		// http://stackoverflow.com/questions/18881693/how-to-import-external-json-and-display-in-php
		extract($config);
		// $options: array()
		// $title: string
		// $id: string
		// $selected: string
		// $description: string
		?>
			<tr>
				<th scope="row">
					<label for="<?php echo $id; ?>"><?php echo $title; ?></label>
				</th>
				<td>
					<select 
						id="<?php echo $id; ?>" 
						name="<?php echo $id; ?>" 
						<?php if (isset($description)) echo "aria-describedby=\"$id-description\"" ?>
						>
						<?php foreach ($options as $option): ?>
							<option 
								value="<?php echo $option; ?>"
								<?php if (isset($selected) && $selected == $option) echo "selected" ?>
								>
								<?php echo ucfirst($option); ?>
							</option>
						<?php endforeach; ?>
					</select>
					<?php if (isset($description)): ?>
						<p class="description" 
							id="<?php echo $id; ?>-description"
							>
							<?php echo $description; ?>
						</p>
					<?php endif; ?>
				</td>
			</tr>
		<?php
	}


	private function output_input_element($OptsArray){
		# code...
	}
	

	private function theme_options() {
    	return json_decode(file_get_contents(dirname(__FILE__) . '/css.json'), TRUE);
	}
	
	public function hesh_print_form() {
		// ob_start();
		?>
			<div class="CodeMirror-settings open" id="CodeMirror-settings" style="display:none;">
				<div class="CodeMirror-settings__wrapper">
					<header class="CodeMirror-settings__header CodeMirror-settings__docked">
						<h2 class="CodeMirror-settings__title">Code Editor Settings</h2>
					</header>
					<?php echo dirname(__FILE__);?>
					<form
						action="<?php echo admin_url('admin-ajax.php');?>" 
						method="post" 
						class="form CodeMirror-settings__form" 
						id="CodeMirror-settings__form"
						>
						<?php wp_nonce_field('hesh_options_form','security-code-here');?>
						<input name="action" value="hesh_options_form" type="hidden">
						<table class="form-table"><tbody>
							<tr><td class="CodeMirror-settings__heading"><h1>
								User Prefrences
							</h1></td></tr>
							<?php
								$this->output_select_element(array(
									"id" => "theme",
									"title" => "Theme",
									"description" => "choose a theme",
									"options" => $this->theme_options(),
									"selected" => "material"
								));
							?>
							<tr><td class="CodeMirror-settings__heading"><h1>
								Addons
							</h1></td></tr>
							<tr>
								<th scope="row"><label for="blogdescription">Tagline</label></th>
								<td><input name="blogdescription" type="text" id="blogdescription" aria-describedby="tagline-description" value="Just another WordPress site" class="regular-text">
								<p class="description" id="tagline-description">In a few words, explain what this site is about.</p></td>
							</tr>
						</tbody></table>
						</form>
					<footer class="CodeMirror-settings__footer CodeMirror-settings__docked">
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__feedback">
							<small>
								Submit a 
								<a href="#" target="_blank">bug report</a> 
								or 
								<a href="#" target="_blank">feature request</a>.
							</small>
						</p>
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__credits">
							<small>
								Created by 
								<a href="#" target="_blank">James Bradford</a> 
								&amp; 
								<a href="#" target="_blank">Petr Mukhortov</a>.
							</small>
						</p>
					</footer>
				</div>
				<div class="CodeMirror-settings__toggle"></div>
			</div>
		<?php 
		// return ob_get_clean();
	}

}

if ( is_admin() ) {
	$hesh = new wp_html_editor_syntax();
}

?>
