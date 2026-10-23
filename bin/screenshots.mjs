/* eslint-disable no-console */
/**
 * Takes the WordPress.org screenshots, assets/screenshot-N.png, of the
 * packaged plugin on a WordPress Playground site with the latest WordPress.
 * Run `npm run package` first, then `npm run screenshots`; package again to
 * put the new images in dist/. The captions are in readme.txt, one per image.
 *
 * The shots recreate the 2.x ones: the same text, the same screens and the
 * same 1218×1100 pixels. WordPress's admin has grown since 2.x, so the area is
 * 900 CSS pixels wide rather than 609, wide enough for the desktop block editor
 * and a single row of Quicktags buttons.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startPlayground } from './playground.mjs';

const root = resolve( fileURLToPath( import.meta.url ), '../..' );
const width = 900;
const scale = 1218 / width;
const height = Math.round( 1100 / scale );

// the promotional sample in README.md, which the 2.x screenshots showed too
const readme = readFileSync( join( root, 'README.md' ), 'utf8' );
const sample = /For promotional text[^\n]*\n+```HTML\n([\s\S]*?)```/.exec(
	readme
)[ 1 ];
const title = 'HTML Editor Syntax Highlighter';
const slug = 'html-editor-syntax-highlighter';

// the parts of the sample the block editor shots use, as blocks
const description = /<p class="description">\s*([^\n]*)/.exec( sample )[ 1 ];
const shortcode = /\[shortcode attribute[^\n]*/.exec( sample )[ 0 ];
const style = sample.slice(
	sample.indexOf( '<style>' ),
	sample.indexOf( '</style>' ) + '</style>'.length
);
const blockSample = [
	'<!-- wp:heading -->',
	`<h2>${ title }</h2>`,
	'<!-- /wp:heading -->',
	'',
	'<!-- wp:paragraph -->',
	`<p>${ description }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:shortcode -->',
	shortcode,
	'<!-- /wp:shortcode -->',
	'',
	'<!-- wp:html -->',
	'<p>It works with inline CSS!</p>',
	style,
	'<!-- /wp:html -->',
].join( '\n' );
// The 2.x shot had a Custom HTML block too. WordPress 7.1 shows that block as
// a preview and keeps its code in an "Edit code" dialog, and a <style>
// previews as nothing.
const visualSample = [
	'<!-- wp:paragraph -->',
	`<p>${ description }</p>`,
	'<!-- /wp:paragraph -->',
	'',
	'<!-- wp:shortcode -->',
	shortcode,
	'<!-- /wp:shortcode -->',
].join( '\n' );

// the 2.x defaults, with code folding on as in the 2.x screenshots, and the
// code as large in the image as the 2.x screenshots' 13px at 2×
const baseSettings = {
	theme: 'wordpress',
	keyMap: 'default',
	tabSize: 4,
	fontSize: 18,
	lineHeight: 1.5,
	lineWrapping: true,
	lineNumbers: true,
	foldGutter: true,
	matchBrackets: false,
	highlightSelectionMatches: false,
	autoCloseTags: false,
	autoCloseBrackets: false,
};

// The post the Classic editor shots edit opens in the Classic editor (the
// test mu-plugin only does that for pages).
const classicPlugin = `<?php
/**
 * Plugin Name: HESH screenshots
 */
add_filter(
	'use_block_editor_for_post',
	function ( $use_block_editor, $post ) {
		return '${ slug }' === $post->post_name ? false : $use_block_editor;
	},
	10,
	2
);
`;

const site = await startPlayground( {
	name: 'screenshots',
	port: 9406,
	steps: [
		{
			step: 'setSiteOptions',
			options: { permalink_structure: '/%postname%/' },
		},
		{
			step: 'writeFile',
			path: '/wordpress/wp-content/plugins/hesh-screenshots.php',
			data: classicPlugin,
		},
		{ step: 'activatePlugin', pluginPath: 'hesh-screenshots.php' },
	],
} );
const browser = await chromium.launch();

async function newPage( viewportWidth, viewportHeight ) {
	const context = await browser.newContext( {
		viewport: { width: viewportWidth, height: viewportHeight },
		deviceScaleFactor: scale,
	} );
	const page = await context.newPage();
	page.on( 'dialog', ( dialog ) => dialog.accept() );
	return page;
}

function saveSettings( page, settings ) {
	return page.evaluate(
		( meta ) =>
			window.wp.apiFetch( {
				path: '/wp/v2/users/me',
				method: 'POST',
				data: { meta: { hesh_settings: meta } },
			} ),
		{ ...baseSettings, ...settings }
	);
}

// the post the Classic editor shots edit: saved, so it has a permalink
let classicPostId;
async function classicPost( page ) {
	if ( ! classicPostId ) {
		classicPostId = await page.evaluate(
			( post ) =>
				window.wp
					.apiFetch( {
						path: '/wp/v2/posts',
						method: 'POST',
						data: post,
					} )
					.then( ( saved ) => saved.id ),
			{ title, slug, status: 'publish', content: sample }
		);
	}
	return classicPostId;
}

// "Edit Post" in the Classic editor's Code tab, with the editor column as wide
// as asked; 10px of margin on the left and 13px on the right, as in 2.x
async function openClassicEditor( settings, columnWidth = width - 23 ) {
	let viewportWidth = columnWidth + 250;
	const viewportHeight = 1400;
	const page = await newPage( viewportWidth, viewportHeight );
	await page.goto( `${ site.url }/wp-admin/edit.php` );
	await saveSettings( page, settings );
	const id = await classicPost( page );
	await page.goto(
		`${ site.url }/wp-admin/post.php?post=${ id }&action=edit`
	);
	await page.click( '#show-settings-link' );
	await page.check( 'input[name="screen_columns"][value="1"]' );
	await page.click( '#show-settings-link' );
	await page.locator( '#screen-meta' ).waitFor( { state: 'hidden' } );
	if ( await page.locator( '#wp-content-wrap.tmce-active' ).count() ) {
		await page.click( '#content-html' );
	}
	await page.locator( '.hesh-classic-editor .cm-content' ).waitFor();
	// the exact sample, whatever the Visual tab did to it
	await page.evaluate( ( content ) => {
		document.getElementById( 'content' ).value = content;
	}, sample );
	// the column doesn't follow the window exactly (the admin menu folds at
	// 960px), so get there in a few steps
	for ( let step = 0; step < 6; step++ ) {
		const actual = await page
			.locator( '#post-body-content' )
			.evaluate( ( element ) => element.getBoundingClientRect().width );
		if ( Math.abs( actual - columnWidth ) < 0.5 ) {
			break;
		}
		viewportWidth = Math.round( viewportWidth + columnWidth - actual );
		await page.setViewportSize( {
			width: viewportWidth,
			height: viewportHeight,
		} );
	}
	return page;
}

// the area from the "Edit Post" heading down, like the 2.x shots, lower if
// that's what it takes to show all of `keepInView`
async function classicClip( page, keepInView ) {
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	const rect = ( selector ) =>
		page
			.locator( selector )
			.evaluate( ( element ) =>
				element.getBoundingClientRect().toJSON()
			);
	const heading = await rect( '.wp-heading-inline' );
	const column = await rect( '#post-body-content' );
	const adminBar = await rect( '#wpadminbar' );
	let y = Math.max( heading.y - 14, adminBar.bottom );
	if ( keepInView ) {
		y = Math.max( y, ( await rect( keepInView ) ).bottom + 14 - height );
	}
	return { x: column.x - 10, y, width, height };
}

// a new block editor post, with the settings sidebar closed
async function openBlockEditor(
	settings,
	postTitle,
	content,
	mode,
	viewportHeight = height
) {
	const page = await newPage( width, viewportHeight );
	const ready = () =>
		page.waitForFunction( () =>
			window.wp?.data?.select( 'core/editor' )?.getCurrentPostId()
		);
	await page.goto( `${ site.url }/wp-admin/post-new.php` );
	await ready();
	await saveSettings( page, settings );
	await page.reload();
	await ready();
	await page.evaluate(
		( [ newTitle, newContent, editorMode ] ) => {
			const { select, dispatch } = window.wp.data;
			const editor = select( 'core/editor' );
			// the settings sidebar: WordPress 6.6 and later, and 6.5
			dispatch( 'core/interface' ).disableComplementaryArea( 'core' );
			dispatch( 'core/interface' ).disableComplementaryArea(
				'core/edit-post'
			);
			dispatch( 'core/editor' ).editPost( { title: newTitle } );
			if ( editorMode === 'text' ) {
				dispatch( 'core' ).editEntityRecord(
					'postType',
					editor.getCurrentPostType(),
					editor.getCurrentPostId(),
					{
						content: newContent,
						blocks: undefined,
						selection: undefined,
					}
				);
			} else {
				dispatch( 'core/block-editor' ).resetBlocks(
					window.wp.blocks.parse( newContent )
				);
			}
			( dispatch( 'core/editor' ).switchEditorMode
				? dispatch( 'core/editor' )
				: dispatch( 'core/edit-post' )
			).switchEditorMode( editorMode );
		},
		[ postTitle, content, mode ]
	);
	if ( mode === 'text' ) {
		await page.locator( '.hesh-block-editor .cm-content' ).waitFor();
	}
	await page
		.locator( '.interface-complementary-area' )
		.waitFor( { state: 'detached' } );
	return page;
}

const shots = [
	// 1. the Classic editor's Code tab (2.x screenshot 1)
	async ( path ) => {
		const page = await openClassicEditor( {} );
		// no focus ring on the Code tab the script clicked
		await page.locator( '#content-html' ).blur();
		await page.screenshot( { path, clip: await classicClip( page ) } );
		await page.context().close();
	},

	// 2. the settings panel, every option on (2.x screenshots 2 and 3)
	async ( path ) => {
		const page = await openClassicEditor( {
			matchBrackets: true,
			highlightSelectionMatches: true,
			autoCloseTags: true,
			autoCloseBrackets: true,
		} );
		await page
			.locator( '#wp-content-editor-container' )
			.getByRole( 'button', { name: 'Code editor settings' } )
			.click();
		await page.locator( '.hesh-settings' ).waitFor();
		// the popover fades in
		await page.waitForTimeout( 1000 );
		await page.screenshot( {
			path,
			clip: await classicClip( page, '.hesh-settings' ),
		} );
		await page.context().close();
	},

	// 3. the block editor's Code Editor (2.x screenshot 5)
	async ( path ) => {
		const page = await openBlockEditor(
			{},
			'Works with Gutenberg!',
			blockSample,
			'text'
		);
		await page.screenshot( { path } );
		await page.context().close();
	},

	// 4. the code alone, from the <div> down (2.x screenshot 6)
	async ( path ) => {
		const page = await openClassicEditor( {}, width );
		// the admin bar and the toolbar stay at the top of the window as the
		// page scrolls, over the code; this shot is only the code
		await page.addStyleTag( {
			content:
				'#wpadminbar, #wp-content-editor-tools, #ed_toolbar { visibility: hidden !important; }',
		} );
		const clip = await page.evaluate(
			( size ) => {
				const line = [
					...document.querySelectorAll(
						'.hesh-classic-editor .cm-line'
					),
				].find( ( element ) => element.textContent === '<div>' );
				window.scrollBy( 0, line.getBoundingClientRect().top - 20 );
				const editor = document
					.querySelector( '.hesh-classic-editor .cm-editor' )
					.getBoundingClientRect();
				return {
					x: editor.x,
					y: line.getBoundingClientRect().top - 8,
					...size,
				};
			},
			{ width, height }
		);
		await page.screenshot( { path, clip } );
		await page.context().close();
	},

	// 5. where the Code Editor is: the visual editor, whose blocks aren't
	// highlighted (2.x screenshot 7), with the Options menu open at it
	async ( path ) => {
		const page = await openBlockEditor( {}, title, visualSample, 'visual' );
		// the paragraph as HTML, as "Edit as HTML" shows it
		await page.evaluate( () => {
			const { select, dispatch } = window.wp.data;
			const [ paragraph ] = select( 'core/block-editor' ).getBlocks();
			dispatch( 'core/block-editor' ).toggleBlockMode(
				paragraph.clientId
			);
			dispatch( 'core/block-editor' ).clearSelectedBlock();
		} );
		await page
			.locator( '.editor-header, .edit-post-header' )
			.getByRole( 'button', { name: 'Options' } )
			.click();
		// the menu focuses its first item; point at Code editor instead
		const codeEditor = page.getByRole( 'menuitemradio', {
			name: /Code editor/,
		} );
		await codeEditor.focus();
		await codeEditor.hover();
		// the menu fades in
		await page.waitForTimeout( 1000 );
		await page.screenshot( { path } );
		await page.context().close();
	},
];

// pngquant picks the fewest colours that still look the same, oxipng then
// recompresses losslessly; both are in Homebrew and most Linux distributions
const optimisers = [
	[
		'pngquant',
		[ '--quality=80-98', '--speed=1', '--strip', '--force', '--ext=.png' ],
	],
	[ 'oxipng', [ '--opt=4', '--strip=safe', '--quiet' ] ],
];
const missing = optimisers.filter(
	( [ command ] ) =>
		spawnSync( command, [ '--version' ], { stdio: 'ignore' } ).error
);
if ( missing.length ) {
	console.warn(
		`Install ${ missing
			.map( ( [ command ] ) => command )
			.join( ' and ' ) } to compress the screenshots for the web.`
	);
}

function optimise( path ) {
	for ( const [ command, args ] of optimisers ) {
		if ( ! missing.some( ( [ name ] ) => name === command ) ) {
			// pngquant exits with 99 when it can't keep the quality; the PNG stays as it is
			spawnSync( command, [ ...args, path ], { stdio: 'inherit' } );
		}
	}
}

try {
	const assets = join( root, 'assets' );
	for ( const file of readdirSync( assets ) ) {
		if ( /^screenshot-\d+\.(png|jpe?g|gif)$/.test( file ) ) {
			unlinkSync( join( assets, file ) );
		}
	}
	for ( const [ index, shot ] of shots.entries() ) {
		const path = join( assets, `screenshot-${ index + 1 }.png` );
		await shot( path );
		optimise( path );
		console.log( `Saved ${ path }` );
	}
} finally {
	await browser.close();
	site.stop();
}
