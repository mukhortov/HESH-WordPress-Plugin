/**
 * Starts a WordPress Playground site with a copy of the packaged plugin, for
 * the scripts in bin/ and the end-to-end tests. Run `npm run package` first.
 *
 * The site uses the end-to-end test mu-plugin (tests/e2e/mu-plugins): the
 * admin is logged in, pages use the Classic editor, core doesn't update itself
 * and the block editor's welcome guides are off.
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
 * @return {Promise<{url: string, stop: () => void, exited: Promise<number|null>}>}
 * The site's address, a function that stops it, and its exit code once it stops.
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

	// Playground reads the blueprint while it starts, the folder goes after that
	const blueprintDir = mkdtempSync(
		join( tmpdir(), `hesh-${ name.replace( /[^\w.-]+/g, '-' ) }-` )
	);
	const removeBlueprint = () =>
		rmSync( blueprintDir, { recursive: true, force: true } );
	process.on( 'exit', removeBlueprint );
	const blueprint = join( blueprintDir, 'blueprint.json' );
	// with a blueprint, Playground takes the versions from it, not from --wp and --php
	writeFileSync(
		blueprint,
		JSON.stringify( { preferredVersions: { wp, php }, steps } )
	);

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
		const exited = new Promise( ( done ) => server.on( 'exit', done ) );
		try {
			await new Promise( ( ready, fail ) => {
				server.stdout.on(
					'data',
					( data ) => /Ready!/.test( data ) && ready()
				);
				exited.then( ( code ) =>
					fail( new Error( `Playground exited with ${ code }` ) )
				);
			} );
		} catch ( error ) {
			if ( attempt === 4 ) {
				removeBlueprint();
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
		removeBlueprint();
		return {
			url: `http://127.0.0.1:${ port }`,
			stop: () => server.kill( 'SIGTERM' ),
			exited,
		};
	}
}
