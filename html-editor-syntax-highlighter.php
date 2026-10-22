<?php
/**
 * Plugin Name:        HTML Editor Syntax Highlighter 
 * Plugin URI:         https://wordpress.org/plugins/html-editor-syntax-highlighter/
 * Description:        Add syntax highlighting to all WordPress code editors using CodeMirror.js
 * Author:             Peter Mukhortov, James Bradford
 * Author URI:         https://github.com/mukhortov/HESH-WordPress-Plugin
 * Version:            2.5.0
 * Requires at least:  6.5
 * Requires PHP:       7.4
 * License:            GPLv2 or later
 * License URI:        https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:        html-editor-syntax-highlighter
 *
 * @package            HESH_plugin
**/

defined( 'ABSPATH' ) || exit;

define( 'HESH_VERSION', '2.5.0' );
define( 'HESH_LIBS', plugins_url( '/', __FILE__ ) );

class Wp_Html_Editor_Syntax_Highlighter {

	private $formProcessName = 'hesh_options_form';
	private $nonceSecretCode = 'secret-code';
	private $prefix = 'hesh_';
	private $userPreferences = null; // built on first use, see hesh_get_options()
	private $isLoaded = false;

	// admin screens ($hook_suffix) where hesh.js runs
	private $editorPages = array( 'post.php', 'post-new.php', 'theme-editor.php', 'plugin-editor.php' );

	public function __construct () {
		add_action( 'wp_ajax_' . $this->formProcessName, array( $this, 'hesh_options_form_process' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'hesh_admin_enqueue_scripts' ) );
		add_action( 'admin_footer', array( $this, 'hesh_output_form' ) );

		// hesh replaces the core CodeMirror instance in the theme & plugin file editors
		add_action( 'load-theme-editor.php', array( $this, 'hesh_disable_core_code_editor' ) );
		add_action( 'load-plugin-editor.php', array( $this, 'hesh_disable_core_code_editor' ) );
	}

	// Use core's own off switch (the same one as the "Disable syntax highlighting" profile option)
	// so wp.themePluginEditor keeps working without its CodeMirror instance
	public function hesh_disable_core_code_editor () {
		add_filter( 'wp_code_editor_settings', '__return_false' );
	}

	// Enqueued scripts and styles for hesh.js
	public function hesh_admin_enqueue_scripts ( $hookSuffix ) {
		if ( ! in_array( $hookSuffix, $this->editorPages, true ) ) return;
		$this->isLoaded = true;

		wp_enqueue_script( 'heshJs', HESH_LIBS . 'hesh.js', array( 'jquery', 'editor' ), HESH_VERSION, true );
		wp_enqueue_style( 'heshCss', HESH_LIBS . 'hesh.css', array(), HESH_VERSION );

		$heshOptions = array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
		);

		// place all the userPreferences into the heshOptions object
		foreach ( $this->hesh_get_options() as $id => $config ) {
			$heshOptions[ $id ] = $config['current'];
		}

		// this shows up in js as window.heshOptions, keeping booleans and numbers typed
		wp_add_inline_script( 'heshJs', 'var heshOptions = ' . wp_json_encode( $heshOptions ) . ';', 'before' );
	}

	private function hesh_get_options() {
		if ( null !== $this->userPreferences ) return $this->userPreferences;

		$this->userPreferences = array(

			// PRIMARY OPTIONS // added in the primary settings bar
			'theme' => array(
				'title' => __( 'Theme', 'html-editor-syntax-highlighter' ),
				'type' => 'select',
				'options' => $this->cssThemes,
				'default' => 'wordpress',
				'set' => 'primary',
			),
			'tabSize' => array(
				'title' => __( 'Indent', 'html-editor-syntax-highlighter' ),
				'type' => 'select',
				'options' => range( 1, 6 ),
				'default' => 4,
				'set' => 'primary',
			),
			'lineWrapping' => array(
				'title' => __( 'Line Wrap', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => true,
				'set' => 'primary',
			),
			'lineNumbers' => array(
				'title' => __( 'Numbering', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => true,
				'set' => 'primary',
			),
			'fontSize' => array(
				'title' => __( 'Font Size', 'html-editor-syntax-highlighter' ),
				'type' => 'select',
				'options' => range( 8, 20 ),
				'default' => 13,
				'set' => 'primary',
			),
			'lineHeight' => array(
				'title' => __( 'Line Height', 'html-editor-syntax-highlighter' ),
				'type' => 'select',
				'options' => range( 1, 2, 0.25 ),
				'default' => 1.5,
				'set' => 'primary',
			),

			// ADVANCED OPTIONS // added to the advanced dropdown
			'matchBrackets' => array(
				'title' => __( 'Match Brackets', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
				'description' => __( 'highlight matching bracket pairs next to cursor', 'html-editor-syntax-highlighter' ),
			),
			'matchTags' => array(
				'title' => __( 'Match Tags', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
				'description' => __( 'highlight matching html tag pairs (not shortcodes)', 'html-editor-syntax-highlighter' ),
			),
			'highlightSelectionMatches' => array(
				'title' => __( 'Highlight Selection Matches', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
				'description' => __( 'highlight all instances of a currently selected word', 'html-editor-syntax-highlighter' ),
			),
			'autoCloseTags' => array(
				'title' => __( 'Auto Close Tags', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
				'description' => __( 'auto-close HTML tags when <code>&gt;</code> or <code>/</code> is typed', 'html-editor-syntax-highlighter' ),
			),
			'autoCloseBrackets' => array(
				'title' => __( 'Auto Close Brackets', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
				'description' => __( 'auto-close brackets and quotes when typed', 'html-editor-syntax-highlighter' ),
			),
			'foldGutter' => array(
				'title' => __( 'Code Folding', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
			),
			'scrollbarStyle' => array(
				'title' => __( 'Show Scrollbars', 'html-editor-syntax-highlighter' ),
				'type' => 'checkbox',
				'default' => false,
				'set' => 'advanced',
			),
			'keyMap' => array(
				'title' => __( 'Key Bindings', 'html-editor-syntax-highlighter' ),
				'type' => 'radio',
				'options' => array( 'default', 'sublime', 'vim', 'emacs' ),
				'default' => 'default',
				'set' => 'advanced',
			),
		);

		$userId = get_current_user_id();
		foreach ( $this->userPreferences as $id => $config ) {
			$key = $this->prefix . $id;
			$current = null;
			// `false` is stored as an empty string, so only an absent key means "never saved"
			if ( metadata_exists( 'user', $userId, $key ) ) {
				$current = $this->hesh_sanitize_option( $config, get_user_meta( $userId, $key, true ) );
			}
			$this->userPreferences[ $id ]['current'] = null === $current ? $config['default'] : $current;
		}

		return $this->userPreferences;
	}

	// Returns the value typed for its option, or null if it isn't an allowed value
	private function hesh_sanitize_option( $config, $value ) {
		switch ( $config['type'] ) {
			case 'checkbox':
				if ( is_bool( $value ) ) return $value;
				return in_array( (string) $value, array( '1', 'true' ), true );
			case 'select':
			case 'radio':
				foreach ( $config['options'] as $option ) {
					if ( (string) $option === (string) $value ) return $option;
				}
				return null;
		}
		return null;
	}

	public function hesh_options_form_process() {
		check_ajax_referer( $this->formProcessName, $this->nonceSecretCode );

		$userId = get_current_user_id();
		foreach ( $this->hesh_get_options() as $id => $config ) {
			if ( ! isset( $_POST[ $id ] ) ) continue;
			$setting = $this->hesh_sanitize_option( $config, sanitize_text_field( wp_unslash( $_POST[ $id ] ) ) );
			if ( null === $setting ) continue;
			update_user_meta( $userId, $this->prefix . $id, $setting );
		}

		wp_send_json_success();
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
		?>
			<label
				class="CodeMirror-settings__button button button-small"
				for="<?php echo esc_attr( $id ); ?>"
				>
				<?php echo esc_html( $config['title'] ); ?>
				<input type="hidden" value="false" name="<?php echo esc_attr( $id ); ?>" />
				<input
					name="<?php echo esc_attr( $id ); ?>"
					id="<?php echo esc_attr( $id ); ?>"
					type="checkbox"
					value="true"
					class="CodeMirror-settings__option"
					<?php checked( $config['current'] ); ?>
				/>
			</label>
		<?php
	}

	private function hesh_output_primary_select($id, $config) {
		?>
			<label
				class="CodeMirror-settings__button CodeMirror-settings__button--select button button-small"
				for="<?php echo esc_attr( $id ); ?>"
				>
				<?php echo esc_html( $config['title'] ); ?>
				<select
					id="<?php echo esc_attr( $id ); ?>"
					name="<?php echo esc_attr( $id ); ?>"
					class="CodeMirror-settings__option"
					>
					<?php foreach ( $config['options'] as $option ): ?>
						<option
							value="<?php echo esc_attr( $option ); ?>"
							<?php selected( $config['current'], $option ); ?>
							>
							<?php echo esc_html( ucfirst( $option ) ); ?>
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
					<?php echo esc_html( $title ); ?>
				</th>
				<td><fieldset>
		<?php else: ?>
				</fieldset></td>
			</tr>
		<?php endif;
	}

	private function hesh_output_checkbox($id, $config) {
		?>
			<label
				for="<?php echo esc_attr( $id ); ?>"
				>
				<input type="hidden" value="false" name="<?php echo esc_attr( $id ); ?>" />
				<input
					name="<?php echo esc_attr( $id ); ?>"
					id="<?php echo esc_attr( $id ); ?>"
					type="checkbox"
					value="true"
					class="CodeMirror-settings__option"
					<?php checked( $config['current'] ); ?>
				/>
				<?php echo esc_html( $config['title'] ); ?>
				<?php if ( isset( $config['description'] ) ): ?>
					<small
					class="description CodeMirror-settings-advanced__description"
					id="<?php echo esc_attr( $id ); ?>-description"
					>
					<?php echo wp_kses( $config['description'], array( 'code' => array() ) ); ?>
				</small>
				<?php endif; ?>
			</label>
			<br/>
		<?php
	}

	private function hesh_output_radio($id, $config) {
		$this->hesh_output_fieldset( $config['title'] );
		foreach ( $config['options'] as $option ):
		?>
			<label>
				<input
					type="radio"
					id="<?php echo esc_attr( $id . '-' . $option ); ?>"
					name="<?php echo esc_attr( $id ); ?>"
					value="<?php echo esc_attr( $option ); ?>"
					class="CodeMirror-settings__option"
					<?php checked( $config['current'], $option ); ?>
				/>
				<span>
					<?php echo esc_html( ucfirst( $option ) ); ?>
				</span>
			</label><br/>
		<?php
		endforeach;
		$this->hesh_output_fieldset();
	}

	public function hesh_output_form() {
		if ( ! $this->isLoaded ) return;
		$userPreferences = $this->hesh_get_options();
		$links = array( 'a' => array( 'href' => array(), 'target' => array() ) );
		?>
			<div class="CodeMirror-settings closed" id="CodeMirror-settings" style="display:none;">
				<form
					action="<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>"
					method="post"
					class="CodeMirror-settings__wrapper"
					id="CodeMirror-settings__form"
					>
					<header class="CodeMirror-settings__header CodeMirror-settings__docked">
						<?php
							foreach ( $userPreferences as $id => $value ) {
								if ( $value['set'] === 'primary' )
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
						<input name="action" value="<?php echo esc_attr( $this->formProcessName ); ?>" type="hidden">
						<table class="form-table"><tbody>
							<tr><td class="CodeMirror-settings__heading" colspan="2">
								<h1>
									<?php esc_html_e( 'Advanced Options', 'html-editor-syntax-highlighter' ); ?>
								</h1>
								</td></tr>
							<?php

							$this->hesh_output_fieldset( __( 'Highlighting', 'html-editor-syntax-highlighter' ) );
								$this->hesh_output_checkbox('matchBrackets',$userPreferences['matchBrackets']);
								$this->hesh_output_checkbox('matchTags',$userPreferences['matchTags']);
								$this->hesh_output_checkbox('highlightSelectionMatches',$userPreferences['highlightSelectionMatches']);
							$this->hesh_output_fieldset();

							$this->hesh_output_fieldset( __( 'Auto Completion', 'html-editor-syntax-highlighter' ) );
								$this->hesh_output_checkbox('autoCloseTags',$userPreferences['autoCloseTags']);
								$this->hesh_output_checkbox('autoCloseBrackets',$userPreferences['autoCloseBrackets']);
							$this->hesh_output_fieldset();

							$this->hesh_output_fieldset( __( 'Editor Tools', 'html-editor-syntax-highlighter' ) );
								$this->hesh_output_checkbox('foldGutter',$userPreferences['foldGutter']);
								$this->hesh_output_checkbox('scrollbarStyle',$userPreferences['scrollbarStyle']);
							$this->hesh_output_fieldset();

							$this->hesh_output_radio('keyMap',$userPreferences['keyMap']);

							?>
						</tbody></table>
					</div>
					<footer class="CodeMirror-settings__footer CodeMirror-settings__docked">
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__feedback">
							<small>
								<?php
								echo wp_kses( sprintf(
									/* translators: 1: plugin review URL, 2: GitHub repository URL, 3: new GitHub issue URL */
									__( 'Leave a <a href="%1$s" target="_blank">review</a>, fork on <a href="%2$s" target="_blank">GitHub</a>, or submit a <a href="%3$s" target="_blank">bug report or enhancement request</a>.', 'html-editor-syntax-highlighter' ),
									esc_url( 'https://wordpress.org/support/plugin/html-editor-syntax-highlighter/reviews/#new-post' ),
									esc_url( 'https://github.com/mukhortov/HESH-WordPress-Plugin/' ),
									esc_url( 'https://github.com/mukhortov/HESH-WordPress-Plugin/issues/new' )
								), $links );
								?>
							</small>
						</p>
						<p class="CodeMirror-settings__foot-content CodeMirror-settings__credits">
							<small>
								<?php
								echo wp_kses( sprintf(
									/* translators: 1: Peter Mukhortov's website URL, 2: James Bradford's website URL */
									__( 'Created by <a href="%1$s" target="_blank">Peter Mukhortov</a> &amp; <a href="%2$s" target="_blank">James Bradford</a>.', 'html-editor-syntax-highlighter' ),
									esc_url( 'https://mukhortov.com/' ),
									esc_url( 'http://www.bradford.digital' )
								), $links );
								?>
							</small>
						</p>
					</footer>
				</form>
				<div class="CodeMirror-settings__toggle" id="CodeMirror-settings__toggle"></div>
			</div>
		<?php
	}

	// to get a list of theme names: `cd node_modules/codemirror/theme/` then run `ls > css-themes.txt`
	private $cssThemes = array( 
		'none', // special
		'wordpress', // custom
		'default', // special
		
		// node_modules/codemirror/theme/
		'3024-day', // SUCKS
		'3024-night', //?? 
		'abbott',
		'abcdef',
		'ambiance-mobile',// BROKEN
		'ambiance',
		'ayu-dark',
		'ayu-mirage',
		'base16-dark',
		'base16-light',
		'bespin',
		'blackboard',
		'cobalt',
		'codepen', // custom
		'colorforth',
		'darcula',
		'dracula',
		'duotone-dark',
		'duotone-light',
		'eclipse',
		'elegant',
		'erlang-dark',
		'gruvbox-dark',
		'github', // from npm
		'hopscotch',
		'icecoder',
		'idea',
		'isotope',
		'juejin',
		'lesser-dark',
		'liquibyte',
		'lucario',
		'material-darker',
		'material-ocean',
		'material-palenight',
		'material',
		'mbo',
		'mdn-like',
		'midnight',
		'monokai',
		'moxer',
		'neat', // SUCKS
		'neo',
		'night',
		'nord',
		'oceanic-next',
		'panda-syntax',
		'paraiso-dark',
		'paraiso-light',
		'pastel-on-dark',
		'railscasts',
		'rubyblue',
		'seti',
		'shadowfox',
		'solarized',
		'ssms', // SUCKS
		'the-matrix',
		'tomorrow-night-bright',
		'tomorrow-night-eighties',
		'ttcn',
		'twilight',
		'vibrant-ink',
		'xq-dark',
		'xq-light', // SUCKS, that yellow...
		'yeti',
		'yonce',
		'zenburn'
	);

}

if ( is_admin() ) {
	$hesh = new Wp_Html_Editor_Syntax_Highlighter();
}
