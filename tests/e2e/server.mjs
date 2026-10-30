/**
 * Starts a WordPress Playground site with the packaged plugin for the
 * end-to-end tests: `node tests/e2e/server.mjs <wp version> <php version> <port>`.
 * Needs `npm run package` first.
 *
 * Uses bin/playground.mjs: `wp-playground-cli start`, which honours --wp and
 * --php, run from a folder of its own for each WordPress version (Playground
 * keeps one site per working directory), and started again if Playground
 * can't reach api.wordpress.org.
 */
import { startPlayground } from '../../bin/playground.mjs';

const [ wp = 'latest', php = '8.3', port = '9400' ] = process.argv.slice( 2 );

const site = await startPlayground( {
	name: `e2e/wp-${ wp }`,
	port: Number( port ),
	wp,
	php,
} );
// eslint-disable-next-line no-console
console.log( `Ready! WordPress ${ wp } is running on ${ site.url }` );

process.on( 'SIGINT', site.stop );
process.on( 'SIGTERM', site.stop );
site.exited.then( ( code ) => process.exit( code ?? 0 ) );
