/**
 * Webpack loader for `@replit/codemirror-emacs`, see webpack.config.js.
 *
 * The package registers its key bindings and commands with statement-level
 * calls marked pure, `/*@__PURE__*\/EmacsHandler.bindKey(...)`. Nothing uses
 * their results, so the minifier deletes them and the Emacs key bindings do
 * nothing in a production build. This removes those marks, and fails the
 * build if a new version registers them some other way.
 *
 * @param {string} source The module's code.
 * @return {string} The code without the pure marks on the registrations.
 */
module.exports = function ( source ) {
	const unmarked = source.replace(
		/\/\*\s*[#@]__PURE__\s*\*\/\s*(?=EmacsHandler\.(?:bindKey|addCommands)\()/g,
		''
	);
	if (
		/[\\/]dist[\\/]index\.js$/.test( this.resourcePath ) &&
		( ! /\bEmacsHandler\.bindKey\(/.test( unmarked ) ||
			! /\bEmacsHandler\.addCommands\(/.test( unmarked ) ||
			// a mark this didn't remove, `/*@__PURE__*/(0, EmacsHandler.bindKey)(` say
			/__PURE__\s*\*\/[\s(]*(?:0\s*,\s*)?EmacsHandler\.(?:bindKey|addCommands)\b/.test(
				unmarked
			) )
	) {
		throw new Error(
			`${ this.resourcePath } no longer registers the Emacs key bindings the way bin/emacs-bindings-loader.cjs expects, check that they survive the minifier.`
		);
	}
	return unmarked;
};
