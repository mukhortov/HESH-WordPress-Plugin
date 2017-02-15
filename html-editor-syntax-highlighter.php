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
		add_action( 'admin_init', array(&$this, 'set_options') );
		add_action( 'admin_enqueue_scripts', array(&$this, 'admin_enqueue_scripts' ) );
		add_action( 'wp_ajax_hesh_options_form', array(&$this, 'hesh_options_form_process'));
		add_action( 'admin_footer', array(&$this, 'hesh_print_form') );
	}
	
	// Enqueues scripts and styles for hesh.js
	public function admin_enqueue_scripts () {
		
		if (
			!strstr($_SERVER['SCRIPT_NAME'], 'post.php') && 
			!strstr($_SERVER['SCRIPT_NAME'], 'post-new.php') &&
			!strstr($_SERVER['SCRIPT_NAME'], 'editor.php')
		) return;
		
		$plugData = get_plugin_data( __FILE__ );
		// need this temporary var to support versions of php < 5.4
		$ver = $plugData['Version'];
		
		wp_enqueue_style( 'codemirror', HESH_LIBS.'codemirror.css', false, $ver );
		wp_enqueue_style( 'material', HESH_LIBS.'material.css', false, $ver );
		wp_enqueue_style( 'heshcss', HESH_LIBS.'hesh.css', false, $ver );
		
		wp_enqueue_script( 'codemirror', HESH_LIBS.'codemirror.js', false, $ver, true );
		wp_enqueue_script( 'xml_cm', HESH_LIBS.'xml.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'javascript_cm', HESH_LIBS.'javascript.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'css_cm', HESH_LIBS.'css.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'htmlmixed_cm', HESH_LIBS.'htmlmixed.js', array('codemirror', 'css_cm', 'javascript_cm', 'xml_cm'), $ver, true );
		wp_enqueue_script( 'clike_cm', HESH_LIBS.'clike.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'php_cm', HESH_LIBS.'php.js', array('codemirror', 'clike_cm', 'htmlmixed_cm'), $ver, true );
		wp_enqueue_script( 'shortcode_cm', HESH_LIBS.'shortcode.js', array('codemirror'), $ver, true );
		wp_enqueue_script( 'wordpresspost_cm', HESH_LIBS.'wordpresspost.js', array('codemirror', 'htmlmixed_cm', 'shortcode_cm'), $ver, true );
		
		wp_enqueue_script( 'jquery');
		wp_enqueue_script( 'heshjs', HESH_LIBS.'hesh.js', array('codemirror', 'jquery', 'editor'), $ver, true );

		$heshOptions = [
			'ajaxUrl' => admin_url( 'admin-ajax.php' ), // url for php file that process ajax request to WP
			'nonce' => wp_create_nonce( 'hesh_options_form' ), // this is a unique token to prevent form hijacking
		];
		foreach ($this->userPrefrences as $id => $value) {
			$heshOptions[$id] = isset($value['current']) ? $value['current'] : $value['default'];
		}

		wp_localize_script(
			'heshjs', // i think... // the handle for the js // the_unique_name_for_your_js
			'heshOptions', // theUniqueNameForYourJSObject
			$heshOptions
		);
		
	}

	private $prefix = 'hesh_';
	private $userPrefrences;
	private $addOns;
	public function set_options() {
		$this->userPrefrences = [
			'theme' => [
				'title' => 'Theme',
				// 'description' => 'choose a theme',
				'type' => 'select',
				'options' => json_decode(file_get_contents(dirname(__FILE__) . '/css.json'), true),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'theme' , true),
				'default' => 'material',
			],
			'tabSize' => [
				'title' => 'Indent Size',
				'type' => 'select',
				'options' => range(1,6),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'tabSize' , true),
				'default' => 4,
			],
			'lineWrapping'=> [
				'title' => 'Text Wrapping',
				'type' => 'checkbox',
				'text' => 'Wrap lines',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineWrapping' , true),
				'default' => true,
			],
			'lineNumbers'=> [
				'title' => 'Numbering',
				'type' => 'checkbox',
				'text' => 'Show line numbers',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineNumbers' , true),
				'default' => true,
			],
			'fontSize'=> [
				'title' => 'Font Size',
				'type' => 'select',
				'options' => range(8,20),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'fontSize' , true),
				'default' => 13,
			],
			'lineHeight'=> [
				'title' => 'Line Height',
				'type' => 'select',
				'options' => range(1,2,0.25),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineHeight' , true),
				'default' => 1.5,
			],
			// 'keyMap'=> [
			// 	'title' => 'Key Mapping',
			// 	'type' => 'select',
			// 	'options' => ['none', 'emacs', 'sublime', 'vim'],
			// 	'current' => get_user_meta( get_current_user_id(), $this->prefix.'keyMap' , true),
			// 	'default' => 'none',
			// ],
		];
		$this->addOns = [
			'styleActiveLine'=> [],
			'matchBrackets'=> [],
			'search'=> [], // and replace
			'highlightSelectionMatches'=> [],
			'styleSelectedText'=> [], // ?
			'autoCloseBrackets'=> [],
			'autoCloseTags'=> [],
			'comment'=> [], // continueComments?
			'foldCode'=> [], // ?
		];
	}

	
	
	// 	AJAX forms
	// 	https://teamtreehouse.com/community/submitting-a-form-in-wordpress-using-ajax
	// 	http://wordpress.stackexchange.com/questions/60758/how-to-handle-form-submission
	
	public function hesh_options_form_process() {
		if (empty($_POST) || !wp_verify_nonce($_POST['secret-code'], 'hesh_options_form')) {
			error_log('You targeted the right function, but sorry, your nonce did not verify.');
			wp_die();
		} else {
			// do your function here
			foreach ($this->userPrefrences as $id => $value) {
				$setting = $_POST[$id];
				if ($setting === 'true') $setting = true;
				if ($setting === 'false') $setting = false;
				if (is_numeric($setting)) $setting = floatval($setting);
				update_user_meta( get_current_user_id(), $this->prefix.$id, $setting);
			}
		}

		// 	process user settings
		// 	https://developer.wordpress.org/plugins/users/working-with-user-metadata/
		// 	https://codex.wordpress.org/Function_Reference/update_user_meta
		# add user meta
	}

	private function output_option($id, $config) {
		switch ($config['type']){
			case 'select':
				$this->output_select($id, $config);
				break;
			case 'checkbox':
				$this->output_checkbox($id, $config);
				break;
		}
	}

	private function output_checkbox($id, $config) {
		extract($config);
		?>
			<tr>
				<th scope="row">
					<?php echo $title; ?>
				</th>
				<td>
					<fieldset>
						<legend class="screen-reader-text">
							<span><?php echo $title; ?></span>
						</legend>
						<label for="<?php echo $id; ?>">
							<input type="hidden" value="false"  name="<?php echo $id; ?>" />
							<input 
								name="<?php echo $id; ?>" 
								id="<?php echo $id; ?>" 
								type="checkbox"
								value="true"
								class="CodeMirror-settings__option"
								<?php if (isset($description)) echo "aria-describedby=\"$id-description\"" ?>
								<?php if ((isset($current) && $current) || (!isset($current) && $default)) echo "checked"; ?>
								/>
							<?php echo $text; ?>
						</label>
						<?php if (isset($description)): ?>
							<p class="description" 
								id="<?php echo $id; ?>-description"
								>
								<?php echo $description; ?>
							</p>
						<?php endif; ?>
					</fieldset>
				</td>
			</tr>
		<?php
	}
	
	private function output_select($id, $config) {
		// http://stackoverflow.com/questions/18881693/how-to-import-external-json-and-display-in-php
		extract($config);
		?>
			<tr>
				<th scope="row">
					<label for="<?php echo $id; ?>"><?php echo $title; ?></label>
				</th>
				<td>
					<select 
						id="<?php echo $id; ?>" 
						name="<?php echo $id; ?>"
						class="CodeMirror-settings__option"
						<?php if (isset($description)) echo "aria-describedby=\"$id-description\"" ?>
						>
						<?php foreach ($options as $option): ?>
							<option 
								value="<?php echo $option; ?>"
								<?php 
									if (isset($current) && $current == $option) echo "selected";
									elseif (!isset($current) && $default == $option) echo "selected"; //TODO: test this
								?>
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
		
	public function hesh_print_form() {
		// ob_start();
		?>
			<div class="CodeMirror-settings closed" id="CodeMirror-settings" style="display:none;">
				<div class="CodeMirror-settings__wrapper">
					<header class="CodeMirror-settings__header CodeMirror-settings__docked">
						<h2 class="CodeMirror-settings__title">Code Editor Settings</h2>
					</header>
					<form
						action="<?php echo admin_url('admin-ajax.php');?>" 
						method="post" 
						class="form CodeMirror-settings__form" 
						id="CodeMirror-settings__form"
						>
						<?php wp_nonce_field('hesh_options_form','secret-code');?>
						<input name="action" value="hesh_options_form" type="hidden">
						<table class="form-table"><tbody>
							<tr><td class="CodeMirror-settings__heading"><h1>
								User Prefrences
							</h1></td></tr>
							<?php
								foreach ($this->userPrefrences as $id => $value) {
									$this->output_option($id,$value);
								}
							?>
							<tr><td class="CodeMirror-settings__heading"><h1>
								Addons
							</h1></td></tr>
							<tr>
								<th scope="row"><label>Coming Soon...</label></th>
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
