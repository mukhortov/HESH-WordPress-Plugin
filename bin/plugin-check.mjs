/* eslint-disable no-console */
/**
 * Runs Plugin Check (https://wordpress.org/plugins/plugin-check/) on the
 * packaged plugin in a WordPress Playground site, through its admin page:
 * its WP-CLI command can't run in Playground. Run `npm run package` first.
 * Exits with 1 if Plugin Check reports errors.
 */
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve( fileURLToPath( import.meta.url ), '../..' );
const port = 9405;
const base = `http://127.0.0.1:${ port }`;
const plugin = join( root, 'dist/plugin-check/html-editor-syntax-highlighter' );

rmSync( plugin, { recursive: true, force: true } );
cpSync( join( root, 'dist/html-editor-syntax-highlighter' ), plugin, {
	recursive: true,
} );

const blueprint = join(
	mkdtempSync( join( tmpdir(), 'hesh-plugin-check-' ) ),
	'blueprint.json'
);
writeFileSync(
	blueprint,
	JSON.stringify( {
		steps: [
			{
				step: 'installPlugin',
				pluginData: {
					resource: 'url',
					url: 'https://downloads.wordpress.org/plugin/plugin-check.zip',
				},
			},
		],
	} )
);

const server = spawn(
	'npx',
	[
		'wp-playground-cli',
		'start',
		`--path=${ plugin }`,
		'--wp=latest',
		'--php=8.3',
		`--port=${ port }`,
		`--blueprint=${ blueprint }`,
		// logs the admin in
		`--mount=${ join( root, 'tests/e2e/mu-plugins' ) }:/wordpress/wp-content/mu-plugins`,
		'--reset',
		'--skip-browser',
	],
	// Playground keeps one site per working directory
	{ cwd: dirname( plugin ), stdio: [ 'ignore', 'pipe', 'inherit' ] }
);
await new Promise( ( ready, fail ) => {
	server.stdout.on( 'data', ( data ) => /Ready!/.test( data ) && ready() );
	server.on( 'exit', ( code ) =>
		fail( new Error( `Playground exited with ${ code }` ) )
	);
} );

let errors = 0;
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	await page.goto(
		`${ base }/wp-admin/tools.php?page=plugin-check&plugin=html-editor-syntax-highlighter`
	);
	await page
		.locator( '#plugin-check__plugins-dropdown' )
		.selectOption(
			'html-editor-syntax-highlighter/html-editor-syntax-highlighter.php'
		);
	for ( const category of await page
		.locator( 'input[name="categories"]' )
		.all() ) {
		await category.check();
	}
	await page.locator( '#plugin-check__submit' ).click();
	await page
		.locator( '#plugin-check__results' )
		.getByText( /Checks complete/i )
		.waitFor( { timeout: 300_000 } );

	const rows = await page
		.locator( '#plugin-check__results tbody tr' )
		.evaluateAll( ( trs ) =>
			trs.map( ( tr ) => {
				const file =
					tr
						.closest( 'table' )
						?.previousElementSibling?.textContent?.trim() ?? '';
				// line, column, type, code, message (the last cell links to the docs)
				const cells = [ ...tr.querySelectorAll( 'td' ) ]
					.slice( 0, 5 )
					.map( ( td ) => td.textContent.trim().split( '\n' )[ 0 ] );
				return { file, cells };
			} )
		);
	for ( const { file, cells } of rows ) {
		if ( cells.some( ( cell ) => cell === 'ERROR' ) ) {
			errors++;
		}
		console.log( `${ file } ${ cells.join( ' | ' ) }` );
	}
	console.log(
		rows.length
			? `${ errors } errors, ${ rows.length - errors } warnings`
			: 'No errors or warnings.'
	);
} finally {
	await browser.close();
	server.kill( 'SIGTERM' );
}
process.exit( errors ? 1 : 0 );
