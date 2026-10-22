/* eslint-disable no-console */
/**
 * Copies the files the plugin ships with into a clean folder:
 * dist/html-editor-syntax-highlighter by default, or $HESH_DIST.
 * Run `npm run package`, which builds first.
 *
 * Hidden files in the target folder (like the .git of a release checkout) are kept.
 *
 * WordPress.org's banners, icons and screenshots go in assets/: scripts/release.sh
 * keeps them out of SVN trunk and copies them to the top-level /assets folder.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve( fileURLToPath( import.meta.url ), '../..' );
const target = resolve(
	root,
	process.env.HESH_DIST || 'dist/html-editor-syntax-highlighter'
);

const files = [
	'html-editor-syntax-highlighter.php',
	'uninstall.php',
	'readme.txt',
];
const folders = [ 'includes', 'build' ];
const wordpressOrgAssets =
	/^(banner-(772x250|1544x500)|icon-(128x128|256x256)|icon|screenshot-\d+)\.(png|jpe?g|gif|svg)$/;

if ( ! existsSync( join( root, 'build', 'block-editor.asset.php' ) ) ) {
	console.error( 'No build found, run `npm run build` first.' );
	process.exit( 1 );
}
if ( target === root ) {
	console.error( 'HESH_DIST must not be the project folder.' );
	process.exit( 1 );
}

await mkdir( target, { recursive: true } );
for ( const entry of await readdir( target ) ) {
	if ( ! entry.startsWith( '.' ) ) {
		await rm( join( target, entry ), { recursive: true, force: true } );
	}
}

for ( const file of files ) {
	await cp( join( root, file ), join( target, file ) );
}
for ( const folder of folders ) {
	await cp( join( root, folder ), join( target, folder ), {
		recursive: true,
		filter: ( source ) => ! source.endsWith( '.map' ),
	} );
}

await mkdir( join( target, 'assets' ) );
for ( const file of await readdir( join( root, 'assets' ) ) ) {
	if ( wordpressOrgAssets.test( file ) ) {
		await cp(
			join( root, 'assets', file ),
			join( target, 'assets', file )
		);
	}
}

// the development copy is labelled "!DEV!" in the plugin list
const main = join( target, 'html-editor-syntax-highlighter.php' );
await writeFile(
	main,
	( await readFile( main, 'utf8' ) ).replace( ' !DEV!', '' )
);

console.log( `Packaged the plugin in ${ target }` );
