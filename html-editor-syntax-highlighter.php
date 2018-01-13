<?php


/**
 * @since              2.2.3
 * @package            HESH_plugin
 *
 * Plugin Name:        HTML Editor Syntax Highlighter
 * Plugin URI:         http://wordpress.org/extend/plugins/html-editor-syntax-highlighter/
 * Description:        Add syntax highlighting to the all WordPress code editors using Codemirror.js
 * Text Domain:        html-editor-syntax-highlighter
 * Author:             Petr Mukhortov
 * Author URI:         http://mukhortov.com/
 * Author:             James Bradford
 * Author URI:         http://bradford.digital/
 * License:            GPL-2.0+
 * License URI:        http://www.gnu.org/licenses/gpl-2.0.txt
 * GitHub Branch:      master
 * GitHub Plugin URI:  https://github.com/mukhortov/HESH-WordPress-Plugin
 * Version:            2.2.3
 * Requires at least:  4.0.15
 * Tested up to:       4.9.1
 * Stable tag:         2.2.3
**/

// Check for required PHP version
if ( version_compare( PHP_VERSION, '5.2.17', '<' ) ) {
    exit( sprintf( 'Foo requires PHP 5.2.17 or higher. You’re still on %s.', PHP_VERSION ) );
}

if ( preg_match( '#' . basename(__FILE__) . '#', $_SERVER['PHP_SELF'] ) ) {
	die('You are not allowed to call this page directly.');
}

define( 'HESH_LIBS', plugins_url( '/dist/', __FILE__ ) );

class wp_html_editor_syntax {
	
	public function __construct () {
		add_action( 'admin_init', array(&$this, 'hesh_set_options') );
		add_action( 'admin_enqueue_scripts', array(&$this, 'hesh_admin_enqueue_scripts' ) );
		add_action( 'wp_ajax_'.$this->formProcessName, array(&$this, 'hesh_options_form_process'));
		add_action( 'admin_footer', array(&$this, 'hesh_output_form') );
	}
		
	// Enqueues scripts and styles for hesh.js
	public function hesh_admin_enqueue_scripts () {
		
		// Load only on certin pages
		if (
			!strstr($_SERVER['SCRIPT_NAME'], 'post.php') && 
			!strstr($_SERVER['SCRIPT_NAME'], 'post-new.php') &&
			!strstr($_SERVER['SCRIPT_NAME'], 'editor.php')
		) return;
		
		// get the plugin version number for cache busting purposes
		$plugData = get_plugin_data( __FILE__ ); // need this temporary var to support versions of php < 5.4
		$ver = $plugData['Version'];
		
		// load minified version if not a localhost dev account
		$min = strpos(home_url(), 'localhost') ? '' : '.min' ;
		wp_enqueue_script( 'jquery');

		// dequeue the native WP code-editor and codemirror
		if (wp_script_is( 'code-editor', 'enqueued' )) wp_dequeue_script( 'code-editor' );
		if (wp_style_is( 'code-editor', 'enqueued' )) wp_dequeue_style( 'code-editor' );
		if (wp_script_is( 'codemirror', 'enqueued' )) wp_dequeue_script( 'codemirror' );
		if (wp_style_is( 'codemirror', 'enqueued' )) wp_dequeue_style( 'codemirror' );

		// enqueue hesh scripts
		wp_enqueue_script( 'heshjs', HESH_LIBS.'hesh'.$min.'.js', array('jquery', 'editor'), $ver, true );
		wp_enqueue_style( 'heshcss', HESH_LIBS.'hesh'.$min.'.css', false, $ver );

		// this shows up in js as window.heshOptions
		$heshOptions = array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
		);

		// place all the userPrefrences into the heshOptions object
		foreach ($this->userPrefrences as $id => $value) {
			$heshOptions[$id] = $value['current'];
		}
		wp_localize_script(
			'heshjs',        // for hesh.js
			'heshOptions',   // the object name, shows up in js as window.heshOptions
			$heshOptions     // the php object to translate to js
		);
		
	}

	private $formProcessName = 'hesh_options_form';
	private $nonceSecretCode = 'secret-code';
	private $prefix = 'hesh_';
	private $userPrefrences; // added to the primary bar
	public function hesh_set_options() {
		$this->userPrefrences = array(

			// PRIMARY OPTIONS // added in the primary settings bar
			'theme' => array(
				'title' => 'Theme',
				'type' => 'select',
				'options' => $this->cssThemes,
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'theme' , true),
				'default' => 'material',
				'set' => 'primary',
			),
			'tabSize' => array(
				'title' => 'Indent',
				'type' => 'select',
				'options' => range(1,6),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'tabSize' , true),
				'default' => 4,
				'set' => 'primary',
			),
			'lineWrapping'=> array(
				'title' => 'Line Wrap',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineWrapping' , true),
				'default' => true,
				'set' => 'primary',
			),
			'lineNumbers'=> array(
				'title' => 'Numbering',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineNumbers' , true),
				'default' => true,
				'set' => 'primary',
			),
			'fontSize'=> array(
				'title' => 'Font Size',
				'type' => 'select',
				'options' => range(8,20),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'fontSize' , true),
				'default' => 13,
				'set' => 'primary',
			),
			'lineHeight'=> array(
				'title' => 'Line Height',
				'type' => 'select',
				'options' => range(1,2,0.25),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'lineHeight' , true),
				'default' => 1.5,
				'set' => 'primary',
			),

			// ADVANCED OPTIONS // added to the advanced dropdown
			'matchBrackets'=> array(
				'title' => 'Match Brackets',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'matchBrackets' , true),
				'default' => false,
				'set' => 'advanced',
				'description' => 'highlight matching bracket pairs next to cursor',
			),
			'matchTags'=> array(
				'title' => 'Match Tags',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'matchTags' , true),
				'default' => false,
				'set' => 'advanced',
				'description' => 'highlight matching html tag pairs (not shortcodes)',
			),
			'highlightSelectionMatches'=> array(
				'title' => 'Highlight Selection Matches',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'highlightSelectionMatches' , true),
				'default' => false,
				'set' => 'advanced',
				'description' => 'highlight all instances of a currently selected word',
			),
			'autoCloseTags'=> array(
				'title' => 'Auto Close Tags',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'autoCloseTags' , true),
				'default' => false,
				'set' => 'advanced',
				'description' => 'auto-close HTML tags when <code>></code> or <code>/</code> is typed',
			),
			'autoCloseBrackets'=> array(
				'title' => 'Auto Close Brackets',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'autoCloseBrackets' , true),
				'default' => false,
				'set' => 'advanced',
				'description' => 'auto-close brackets and quotes when typed',
			),
			'foldGutter'=> array(
				'title' => 'Code Folding',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'foldGutter' , true),
				'default' => false,
				'set' => 'advanced',
				// 'description' => 'fold HTML code (not shortcodes)',
			),
			'scrollbarStyle'=> array(
				'title' => 'Show Scrollbars',
				'type' => 'checkbox',
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'scrollbarStyle' , true),
				'default' => false,
				'set' => 'advanced',
			),
			'keyMap'=> array(
				'title' => 'Key Mapping',
				'type' => 'radio',
				'options' => array('default', 'sublime', 'vim', 'emacs'),
				'current' => get_user_meta( get_current_user_id(), $this->prefix.'keyMap' , true),
				'default' => 'default',
				'set' => 'advanced',
			),
		);

		// Intalize all the hesh option fields as default if they don't exist yet
		foreach ($this->userPrefrences as $id => $value) {
			if (!isset($value['current']) || trim($value['current'])==='')
				update_user_meta( get_current_user_id(), $this->prefix.$id, $value['default']);
			// error_log( $id . ': ' . $value['current'] . ': ' . isset($value['current']) ); // for debug
		}
	}
	
	public function hesh_options_form_process() {
		if (empty($_POST) || !wp_verify_nonce($_POST[$this->nonceSecretCode], $this->formProcessName)) {
			error_log('The nonce did not verify.');
			wp_die();
		} else {
			foreach ($this->userPrefrences as $id => $value) {
				$setting = $_POST[$id];
				if ($setting === 'true') $setting = true;
				if ($setting === 'false') $setting = false;
				if (is_numeric($setting)) $setting = floatval($setting);
				update_user_meta( get_current_user_id(), $this->prefix.$id, $setting);
			}
		}
	}

	private function hesh_output_option($id, $config) {
		switch ($config['type']){
			case 'select':
				$this->hesh_output_primary_select($id, $config);
				break;
			case 'checkbox':
				$this->hesh_output_primary_toggle($id, $config);
				break;
		}
	}

	private function hesh_output_primary_toggle($id, $config) {
		extract($config);
		?>
			<label 
				class="CodeMirror-settings__button button button-small"
				for="<?php echo $id; ?>"
				>
				<?php echo $title; ?>
				<input type="hidden" value="false" name="<?php echo $id; ?>" />
				<input 
					name="<?php echo $id; ?>" 
					id="<?php echo $id; ?>" 
					type="checkbox"
					value="true"
					class="CodeMirror-settings__option"
					<?php if ($current) echo 'checked'; ?>
				/>
			</label>
		<?php 
	}
	
	private function hesh_output_primary_select($id, $config) {
		extract($config);
		?>
			<label 
				class="CodeMirror-settings__button CodeMirror-settings__button--select button button-small"
				for="<?php echo $id; ?>"
				>
				<?php echo $title; ?>
				<select 
					id="<?php echo $id; ?>" 
					name="<?php echo $id; ?>"
					class="CodeMirror-settings__option"
					>
					<?php foreach ($options as $option): ?>
						<option 
							value="<?php echo $option; ?>"
							<?php if ($current == $option) echo 'selected';?>
							>
							<?php echo ucfirst($option); ?>
						</option>
					<?php endforeach; ?>
				</select>
			</label>
		<?php
	}

	private function hesh_output_fieldset($title=false) {
		if ($title): ?>
			<tr>
				<th scope="row">
					<?php echo $title; ?>
				</th>
				<td><fieldset>
		<?php else: ?>
				</fieldset></td>
			</tr>
		<?php endif;
	}

	private function hesh_output_checkbox($id, $config) {
		extract($config);
		?>
			<label 
				for="<?php echo $id; ?>"
				>
				<input type="hidden" value="false" name="<?php echo $id; ?>" />
				<input 
					name="<?php echo $id; ?>" 
					id="<?php echo $id; ?>" 
					type="checkbox"
					value="true"
					class="CodeMirror-settings__option"
					<?php if ($current) echo 'checked'; ?>
				/>
				<?php echo $title; ?>
				<?php if (isset($description)): ?>
					<small 
					class="description CodeMirror-settings-advanced__description" 
					id="<?php echo $id; ?>-description"
					>
					<?php echo $description; ?>
				</small>
				<?php endif; ?>
			</label>
			<br/>
		<?php
	}

	private function hesh_output_radio($id, $config) {
		extract($config);
		$this->hesh_output_fieldset('Key Bindings'); 
		foreach ($options as $option): 
		?>
			<label>
				<input 
					type="radio" 
					id="<?php echo $id; ?>" 
					name="<?php echo $id; ?>"
					value="<?php echo $option; ?>"
					class="CodeMirror-settings__option"
					<?php if ($current == $option) echo 'checked'; ?>
				/>
				<span>
					<?php echo ucfirst($option); ?>
				</span>
			</label><br/>
		<?php 
		endforeach; 
		$this->hesh_output_fieldset(); 
	}
		
	public function hesh_output_form() {
		?>
			<div class="CodeMirror-settings closed" id="CodeMirror-settings" style="display:none;">
				<form
					action="<?php echo admin_url('admin-ajax.php');?>" 
					method="post" 
					class="CodeMirror-settings__wrapper" 
					id="CodeMirror-settings__form"
					>
					<header class="CodeMirror-settings__header CodeMirror-settings__docked">
						<?php
							foreach ($this->userPrefrences as $id => $value) {
								if ( $value['set'] === 'advanced' ) continue;
								$this->hesh_output_option($id,$value);
							}
						?>
						<a 
							class="CodeMirror-settings__toggle-advanced" 
							id="CodeMirror-settings__toggle-advanced"
						></a>
					</header>
					<div class="form CodeMirror-settings__body">
						<?php wp_nonce_field($this->formProcessName,$this->nonceSecretCode);?>
						<input name="action" value="hesh_options_form" type="hidden">
						<table class="form-table"><tbody>
							<tr><td class="CodeMirror-settings__heading" colspan="2">
								<h1>
									Advanced Options
								</h1>
								<!-- <small>These features are experimental and may have bugs</small> -->
							</td></tr>
							<?php

							$this->hesh_output_fieldset('Highlighting'); 
								$this->hesh_output_checkbox('matchBrackets',$this->userPrefrences['matchBrackets']); 
								$this->hesh_output_checkbox('matchTags',$this->userPrefrences['matchTags']); 
								$this->hesh_output_checkbox('highlightSelectionMatches',$this->userPrefrences['highlightSelectionMatches']); 
							$this->hesh_output_fieldset(); 
							
							$this->hesh_output_fieldset('Auto Completion'); 
								$this->hesh_output_checkbox('autoCloseTags',$this->userPrefrences['autoCloseTags']); 
								$this->hesh_output_checkbox('autoCloseBrackets',$this->userPrefrences['autoCloseBrackets']); 
							$this->hesh_output_fieldset(); 

							$this->hesh_output_fieldset('Editor Tools'); 
								$this->hesh_output_checkbox('foldGutter',$this->userPrefrences['foldGutter']); 
								$this->hesh_output_checkbox('scrollbarStyle',$this->userPrefrences['scrollbarStyle']); 
							$this->hesh_output_fieldset(); 

							$this->hesh_output_radio('keyMap',$this->userPrefrences['keyMap']); 

							?>
						</tbody></table>
					</div>
					<footer class="CodeMirror-settings__footer CodeMirror-settings__docked">
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__feedback">
							<small>Leave a 
								<a href="https://wordpress.org/support/plugin/html-editor-syntax-highlighter/reviews/#new-post" target="_blank">review</a>,
								fork on
								<a href="https://github.com/mukhortov/HESH-WordPress-Plugin/" target="_blank">Github</a>, 
								or submit a 
								<a href="https://github.com/mukhortov/HESH-WordPress-Plugin/issues/new" target="_blank">bug report or enhancement request</a>. 
							</small>
						</p>
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__credits">
							<small>
								Created by 
								<a href="http://www.bradford.digital" target="_blank">James Bradford</a> 
								&amp; 
								<a href="http://www.mukhortov.com/" target="_blank">Petr Mukhortov</a>.
							</small>
						</p>
					</footer>
				</form>
				<div class="CodeMirror-settings__toggle" id="CodeMirror-settings__toggle"></div>
			</div>
		<?php 
	}

	private $cssThemes = array( 
		'none',
		'default',
		'3024-day',
		'3024-night',
		'abcdef',
		'ambiance-mobile',
		'ambiance',
		'base16-dark',
		'base16-light',
		'bespin',
		'blackboard',
		'cobalt',
		'colorforth',
		'dracula',
		'duotone-dark',
		'duotone-light',
		'eclipse',
		'elegant',
		'erlang-dark',
		'hopscotch',
		'icecoder',
		'isotope',
		'lesser-dark',
		'liquibyte',
		'material',
		'mbo',
		'mdn-like',
		'midnight',
		'monokai',
		'neat',
		'neo',
		'night',
		'panda-syntax',
		'paraiso-dark',
		'paraiso-light',
		'pastel-on-dark',
		'railscasts',
		'rubyblue',
		'seti',
		'solarized',
		'the-matrix',
		'tomorrow-night-bright',
		'tomorrow-night-eighties',
		'ttcn',
		'twilight',
		'vibrant-ink',
		'xq-dark',
		'xq-light',
		'yeti',
		'zenburn'
	);

}

if ( is_admin() ) {
	$hesh = new wp_html_editor_syntax();
}

?>
