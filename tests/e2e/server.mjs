/**
 * Starts a WordPress Playground site with the packaged plugin for the
 * end-to-end tests: `node tests/e2e/server.mjs <wp version> <php version> <port>`.
 * Needs `npm run package` first.
 *
 * Uses `wp-playground-cli start`, which honours --wp and --php (the lower-level
 * `server` command ran the latest WordPress whatever version was asked for).
 * Playground keeps one site per working directory, so each WordPress version
 * runs in its own folder, with its own copy of the plugin.
 */
import { spawn } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [ wp = 'latest', php = '8.3', port = '9400' ] = process.argv.slice( 2 );
const root = resolve( fileURLToPath( import.meta.url ), '../../..' );
const plugin = join(
	root,
	'dist/e2e',
	`wp-${ wp }`,
	'html-editor-syntax-highlighter'
);

rmSync( plugin, { recursive: true, force: true } );
cpSync( join( root, 'dist/html-editor-syntax-highlighter' ), plugin, {
	recursive: true,
} );

const server = spawn(
	'npx',
	[
		'wp-playground-cli',
		'start',
		`--path=${ plugin }`,
		`--wp=${ wp }`,
		`--php=${ php }`,
		`--port=${ port }`,
		`--mount=${ join( root, 'tests/e2e/mu-plugins' ) }:/wordpress/wp-content/mu-plugins`,
		'--define-bool',
		'AUTOMATIC_UPDATER_DISABLED',
		'true',
		'--reset',
		'--skip-browser',
	],
	{ cwd: dirname( plugin ), stdio: 'inherit' }
);
const stop = () => server.kill( 'SIGTERM' );
process.on( 'SIGINT', stop );
process.on( 'SIGTERM', stop );
server.on( 'exit', ( code ) => process.exit( code ?? 0 ) );
