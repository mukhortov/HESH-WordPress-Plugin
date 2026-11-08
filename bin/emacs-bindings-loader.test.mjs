import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire( import.meta.url );
const loader = require( './emacs-bindings-loader.cjs' );
// the ES module webpack bundles, not the package's CommonJS entry
const packageFile = fileURLToPath(
	new URL(
		'../node_modules/@replit/codemirror-emacs/dist/index.js',
		import.meta.url
	)
);
const run = ( source, resourcePath = packageFile ) =>
	loader.call( { resourcePath }, source );

const registrations =
	'EmacsHandler.bindKey(i, keys[i]);\nEmacsHandler.addCommands({ killLine });\n';

describe( 'emacs-bindings-loader', () => {
	it( 'checks the file webpack builds', () => {
		expect( packageFile ).toMatch( /[\\/]dist[\\/]index\.js$/ );
	} );

	it( 'keeps the installed package’s registrations from the minifier', () => {
		const source = readFileSync( packageFile, 'utf8' );
		expect( source ).toMatch( /__PURE__\s*\*\/\s*EmacsHandler\.bindKey/ );
		const result = run( source );
		expect( result ).toMatch( /EmacsHandler\.bindKey\(/ );
		expect( result ).not.toMatch(
			/__PURE__\s*\*\/\s*EmacsHandler\.(bindKey|addCommands)/
		);
	} );

	it.each( [ '/*@__PURE__*/', '/*#__PURE__*/', '/* @__PURE__ */' ] )(
		'removes %s marks on the registrations',
		( mark ) => {
			const marked = `${ mark }EmacsHandler.bindKey(i, keys[i]);\n${ mark } EmacsHandler.addCommands({ killLine });\n`;
			expect( run( marked ) ).toBe( registrations );
		}
	);

	it( 'leaves other pure marks', () => {
		const source = `const a = /*@__PURE__*/ make(); ${ registrations }`;
		expect( run( source ) ).toBe( source );
	} );

	it.each( [
		[ 'renamed', 'Handler.bindKey(i, k);\nHandler.addCommands({});' ],
		[
			'called another way',
			'/*@__PURE__*/(0, EmacsHandler.bindKey)(i, k);\nEmacsHandler.bindKey;\nEmacsHandler.addCommands({});',
		],
	] )( 'fails the build when the registrations are %s', ( _, source ) => {
		expect( () => run( source ) ).toThrow( /emacs-bindings-loader/ );
	} );

	it( 'only checks the package’s main file', () => {
		expect( run( 'export {};', '/x/node_modules/y/dist/index.cjs' ) ).toBe(
			'export {};'
		);
	} );
} );
