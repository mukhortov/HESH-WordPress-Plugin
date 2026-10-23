/**
 * Starts a WordPress Playground site with a copy of the packaged plugin, for
 * the scripts in bin/. Run `npm run package` first.
 *
 * The site uses the end-to-end test mu-plugin (tests/e2e/mu-plugins): the
 * admin is logged in, pages use the Classic editor, core doesn't update itself
 * and the block editor's welcome guide is off.
 */
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve( fileURLToPath( import.meta.url ), '../..' );

/**
 * @param {Object} options
 * @param {string} options.name    Folder for the site, under dist/.
 * @param {number} options.port    Port to serve on.
 * @param {Array}  [options.steps] Blueprint steps to run first.
 * @param {string} [options.wp]    WordPress version.
 * @param {string} [options.php]   PHP version.
 * @return {Promise<{url: string, stop: () => void}>} The site's address, and a function that stops it.
 */
export async function startPlayground( {
	name,
	port,
	steps = [],
	wp = 'latest',
	php = '8.3',
} ) {
	const plugin = join( root, 'dist', name, 'html-editor-syntax-highlighter' );
	rmSync( plugin, { recursive: true, force: true } );
	cpSync( join( root, 'dist/html-editor-syntax-highlighter' ), plugin, {
		recursive: true,
	} );

	const blueprint = join(
		mkdtempSync( join( tmpdir(), `hesh-${ name }-` ) ),
		'blueprint.json'
	);
	writeFileSync( blueprint, JSON.stringify( { steps } ) );

	// Starting fails with "fetch failed" when Playground can't reach
	// api.wordpress.org to look up the WordPress version, which happens in
	// bursts, so try a few more times, waiting longer each time.
	for ( let attempt = 1; ; attempt++ ) {
		const server = spawn(
			'npx',
			[
				'wp-playground-cli',
				'start',
				`--path=${ plugin }`,
				`--wp=${ wp }`,
				`--php=${ php }`,
				`--port=${ port }`,
				`--blueprint=${ blueprint }`,
				`--mount=${ join( root, 'tests/e2e/mu-plugins' ) }:/wordpress/wp-content/mu-plugins`,
				'--define-bool',
				'AUTOMATIC_UPDATER_DISABLED',
				'true',
				'--reset',
				'--skip-browser',
			],
			// Playground keeps one site per working directory
			{ cwd: dirname( plugin ), stdio: [ 'ignore', 'pipe', 'inherit' ] }
		);
		try {
			await new Promise( ( ready, fail ) => {
				server.stdout.on(
					'data',
					( data ) => /Ready!/.test( data ) && ready()
				);
				server.on( 'exit', ( code ) =>
					fail( new Error( `Playground exited with ${ code }` ) )
				);
			} );
		} catch ( error ) {
			if ( attempt === 4 ) {
				throw error;
			}
			const seconds = attempt * 5;
			// eslint-disable-next-line no-console
			console.error(
				`${ error.message }, starting it again in ${ seconds } seconds`
			);
			await new Promise( ( wait ) => setTimeout( wait, seconds * 1000 ) );
			continue;
		}
		return {
			url: `http://127.0.0.1:${ port }`,
			stop: () => server.kill( 'SIGTERM' ),
		};
	}
}
