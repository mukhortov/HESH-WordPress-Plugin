const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		'block-editor': './src/block-editor/index.ts',
		'classic-editor': './src/classic-editor/index.ts',
	},
	module: {
		...defaultConfig.module,
		rules: [
			...defaultConfig.module.rules,
			{
				// keeps the Emacs key bindings through minification
				test: /[\\/]@replit[\\/]codemirror-emacs[\\/].*\.js$/,
				use: require.resolve( './bin/emacs-bindings-loader.cjs' ),
			},
		],
	},
	// CodeMirror with the HTML, CSS and JavaScript parsers is about 570 KiB,
	// themes and keymaps are loaded separately when they are used
	performance: {
		maxAssetSize: 700 * 1024,
		maxEntrypointSize: 700 * 1024,
	},
};
