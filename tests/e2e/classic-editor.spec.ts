import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	acceptDialogs,
	codeMirror,
	codeMirrorText,
	saveSettings,
} from './helpers';

// pages use the Classic editor on the test site, see mu-plugins/hesh-e2e.php
const editor = '.hesh-classic-editor';

async function openClassicEditor(
	page: Page,
	path = '/wp-admin/post-new.php?post_type=page'
) {
	acceptDialogs( page );
	await page.goto( path );
	if ( await page.locator( '#wp-content-wrap.tmce-active' ).count() ) {
		await page.click( '#content-html' );
	}
	await expect( codeMirror( page, editor ) ).toBeVisible();
}

const textareaValue = ( page: Page ) =>
	page.evaluate(
		() =>
			( document.getElementById( 'content' ) as HTMLTextAreaElement )
				.value
	);

// the value the form submits, not CodeMirror's copy behind the textarea's value property
const submittedValue = ( page: Page ) =>
	page.evaluate( () => {
		const textarea = document.getElementById(
			'content'
		) as HTMLTextAreaElement;
		return Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			'value'
		)!.get!.call( textarea );
	} );

// Fills the full-height editor with numbered lines and waits for it to grow.
async function fillLines( page: Page, count: number ) {
	await expect( page.locator( '#postdivrich.wp-editor-expand' ) ).toHaveCount(
		1
	);
	await page.evaluate( ( lines ) => {
		( document.getElementById( 'content' ) as HTMLTextAreaElement ).value =
			Array.from(
				{ length: lines },
				( _, line ) => `<p>Line ${ line }</p>`
			).join( '\n' );
	}, count );
	await expect
		.poll( () =>
			page
				.locator( editor )
				.evaluate(
					( element ) => element.getBoundingClientRect().height
				)
		)
		.toBeGreaterThan( count * 10 );
}

// Whether the middle of the element shows, not something laid over it.
const isOnTop = ( locator: Locator ) =>
	locator.evaluate( ( element ) => {
		const { left, top, width, height } = element.getBoundingClientRect();
		return (
			document.elementFromPoint( left + width / 2, top + height / 2 ) ===
			element
		);
	} );

const toolbarPosition = ( page: Page ) =>
	page
		.locator( '#ed_toolbar' )
		.evaluate( ( element ) => getComputedStyle( element ).position );

// the part of jQuery the tests use to drive editor-expand.js
interface WithJQuery {
	jQuery: ( target: Window | Document ) => {
		off: ( events: string ) => void;
		trigger: ( event: string ) => void;
	};
}

// two frames: CodeMirror has scrolled and WordPress has moved its bars
const nextFrames = ( page: Page ) =>
	page.evaluate(
		() =>
			new Promise( ( resolve ) =>
				requestAnimationFrame( () => requestAnimationFrame( resolve ) )
			)
	);

test.describe( 'Classic editor Text tab', () => {
	test.beforeEach( async ( { page } ) => {
		acceptDialogs( page );
		await page.goto( '/wp-admin/post-new.php?post_type=page' );
		await page.waitForFunction(
			() => typeof wp !== 'undefined' && !! wp.apiFetch
		);
		await saveSettings( page, {} );
		// a test that turned the full-height editor off, then failed before turning it back on
		if (
			await page.evaluate(
				() => window.getUserSetting( 'editor_expand' ) === 'off'
			)
		) {
			await page.evaluate( () =>
				window.setUserSetting( 'editor_expand', 'on' )
			);
			// saved with the next page load
			await page.reload();
		}
	} );

	test( 'lays CodeMirror over the textarea and keeps the textarea in step', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await expect( page.locator( editor ) ).toHaveCount( 1 );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Hello [shortcode]</p>' );
		expect( await textareaValue( page ) ).toBe(
			'<p>Hello [shortcode]</p>'
		);
		expect( await submittedValue( page ) ).toBe(
			'<p>Hello [shortcode]</p>'
		);
	} );

	test( 'keeps text typed into the textarea while CodeMirror loads', async ( {
		page,
	} ) => {
		// CodeMirror waits for the Vim keymap chunk, hold it back
		await saveSettings( page, { keyMap: 'vim' } );
		await page.route( '**/build/keymap-vim.js*', async ( route ) => {
			await new Promise( ( resolve ) => setTimeout( resolve, 6000 ) );
			await route.continue();
		} );
		await page.goto( '/wp-admin/post-new.php?post_type=page' );
		if ( await page.locator( '#wp-content-wrap.tmce-active' ).count() ) {
			await page.click( '#content-html' );
		}
		await expect( page.locator( editor ) ).toHaveCount( 0 );
		await page.locator( '#content' ).click();
		await page.keyboard.type( 'typed while loading' );

		await expect( codeMirror( page, editor ) ).toBeVisible();
		expect( await codeMirrorText( page, editor ) ).toBe(
			'typed while loading'
		);
		expect( await textareaValue( page ) ).toBe( 'typed while loading' );
		expect( await submittedValue( page ) ).toBe( 'typed while loading' );
		// the cursor carries over, and CodeMirror has the focus
		await expect( codeMirror( page, editor ) ).toBeFocused();
		expect(
			await page.evaluate(
				() =>
					(
						document.getElementById(
							'content'
						) as HTMLTextAreaElement
					 ).selectionStart
			)
		).toBe( 'typed while loading'.length );
	} );

	test( 'Quicktags buttons work on the CodeMirror selection', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( 'some bold text' );
		// select "bold"
		for ( let i = 0; i < 5; i++ ) {
			await page.keyboard.press( 'ArrowLeft' );
		}
		for ( let i = 0; i < 4; i++ ) {
			await page.keyboard.press( 'Shift+ArrowLeft' );
		}
		await page.click( '#qt_content_strong' );
		expect( await textareaValue( page ) ).toBe(
			'some <strong>bold</strong> text'
		);

		// undo stays in CodeMirror
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+z' );
		expect( await textareaValue( page ) ).toBe( 'some bold text' );
	} );

	test( 'setRangeText() edits CodeMirror like typing', async ( { page } ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Hello</p>' );
		await page.evaluate( () =>
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).setRangeText( ' world', 8, 8, 'end' )
		);
		expect( await textareaValue( page ) ).toBe( '<p>Hello world</p>' );
		expect( await submittedValue( page ) ).toBe( '<p>Hello world</p>' );
		expect( await codeMirrorText( page, editor ) ).toBe(
			'<p>Hello world</p>'
		);
		expect(
			await page.evaluate(
				() =>
					(
						document.getElementById(
							'content'
						) as HTMLTextAreaElement
					 ).selectionStart
			)
		).toBe( 14 );

		// and it can be undone
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+z' );
		expect( await textareaValue( page ) ).toBe( '<p>Hello</p>' );
	} );

	test( 'the link dialog inserts at the cursor', async ( { page } ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( 'Read the docs' );
		for ( let i = 0; i < 4; i++ ) {
			await page.keyboard.press( 'Shift+ArrowLeft' );
		}
		await page.click( '#qt_content_link' );
		await page.locator( '#wp-link-url' ).fill( 'https://example.com/' );
		await page.click( '#wp-link-submit' );
		expect( await textareaValue( page ) ).toBe(
			'Read the <a href="https://example.com/">docs</a>'
		);
	} );

	test( 'media inserts go into CodeMirror', async ( { page } ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p></p>' );
		for ( let i = 0; i < 4; i++ ) {
			await page.keyboard.press( 'ArrowLeft' );
		}
		// what the media modal calls when inserting
		await page.evaluate( () =>
			window.send_to_editor( '<img src="photo.jpg" alt="" />' )
		);
		expect( await textareaValue( page ) ).toBe(
			'<p><img src="photo.jpg" alt="" /></p>'
		);
	} );

	test( 'keeps the content when switching to the Visual tab and back', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Round trip</p>' );
		await page.click( '#content-tmce' );
		await expect( page.locator( editor ) ).toBeHidden();
		await page.click( '#content-html' );
		await expect( codeMirror( page, editor ) ).toBeVisible();
		expect( await codeMirrorText( page, editor ) ).toContain(
			'Round trip'
		);
	} );

	test( 'grows with the full-height editor', async ( { page } ) => {
		await openClassicEditor( page );
		await expect(
			page.locator( '#postdivrich.wp-editor-expand' )
		).toHaveCount( 1 );
		await page.evaluate( () => {
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).value = Array.from(
				{ length: 120 },
				( _, line ) => `<p>Line ${ line }</p>`
			).join( '\n' );
		} );
		const heights = () =>
			page.evaluate( () => ( {
				editor: document
					.querySelector( '.hesh-classic-editor' )!
					.getBoundingClientRect().height,
				// editor-expand.js sizes the textarea, CodeMirror follows it
				textarea: document
					.getElementById( 'content' )!
					.getBoundingClientRect().height,
			} ) );
		await expect
			.poll( async () => ( await heights() ).editor )
			.toBeGreaterThan( 1500 );
		const { editor: editorHeight, textarea } = await heights();
		expect( Math.abs( editorHeight - textarea ) ).toBeLessThan( 2 );
	} );

	test( 'saves with Ctrl+S during an autosave, once, and restores the cursor', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		// Leaving the title of a new post starts an autosave, and WordPress
		// ignores clicks on the save buttons until it is done. Make it slow.
		const ajax = '**/wp-admin/admin-ajax.php';
		await page.route( ajax, async ( route ) => {
			await new Promise( ( resolve ) => setTimeout( resolve, 3000 ) );
			await route.continue().catch( () => {} );
		} );
		const saves: string[] = [];
		page.on( 'request', ( request ) => {
			if (
				request.method() === 'POST' &&
				new URL( request.url() ).pathname.endsWith(
					'/wp-admin/post.php'
				)
			) {
				saves.push( request.url() );
			}
		} );

		await page.fill( '#title', 'Classic test' );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Saved from CodeMirror</p>' );
		await page.keyboard.press( 'ArrowLeft' );
		const cursor = await page.evaluate(
			() =>
				( document.getElementById( 'content' ) as HTMLTextAreaElement )
					.selectionStart
		);
		await expect( page.locator( '#save-post' ) ).toHaveClass( /disabled/ );

		// pressed twice while waiting, saved once
		await Promise.all( [
			page.waitForURL( /post\.php\?post=\d+&action=edit/ ),
			( async () => {
				await page.keyboard.press( 'ControlOrMeta+s' );
				await page.keyboard.press( 'ControlOrMeta+s' );
			} )(),
		] );
		expect( saves ).toHaveLength( 1 );

		await page.unroute( ajax );
		await openClassicEditor( page, page.url() );
		expect( await textareaValue( page ) ).toBe(
			'<p>Saved from CodeMirror</p>'
		);
		expect(
			await page.evaluate(
				() =>
					(
						document.getElementById(
							'content'
						) as HTMLTextAreaElement
					 ).selectionStart
			)
		).toBe( cursor );
	} );

	test( 'keeps emoji, with WordPress’s emoji script off on this screen', async ( {
		page,
	} ) => {
		// Tell WordPress the browser can't show flags, as in Windows browsers. Its
		// emoji script would then swap emoji in new DOM, CodeMirror's included,
		// for images, which CodeMirror takes for the emoji being deleted.
		await page.addInitScript( () => {
			window.sessionStorage.setItem(
				'wpEmojiSettingsSupports',
				JSON.stringify( {
					supportTests: { flag: false, emoji: true },
					timestamp: Date.now(),
				} )
			);
		} );
		await openClassicEditor( page );
		expect(
			await page.evaluate( () => typeof window._wpemojiSettings )
		).toBe( 'undefined' );
		await codeMirror( page, editor ).click();
		await page.keyboard.insertText( '<p>Flag 🇺🇦 face 😀</p>' );
		await expect( page.locator( `${ editor } img` ) ).toHaveCount( 0 );
		expect( await submittedValue( page ) ).toBe( '<p>Flag 🇺🇦 face 😀</p>' );
	} );

	test( 'keeps its toolbar buttons when Quicktags rebuilds the toolbar', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		// Adding a button makes Quicktags rewrite the whole toolbar, as it does
		// when it starts after the plugin on some page loads.
		await page.evaluate( () =>
			window.QTags.addButton( 'hesh_test', 'test', '<test>', '</test>' )
		);
		await expect( page.locator( '#qt_content_hesh_test' ) ).toBeVisible();
		// the fullscreen button is hidden while the full-height editor is on
		await expect(
			page.locator( '#ed_toolbar .hesh-fullscreen-toggle' )
		).toHaveCount( 1 );
		await expect(
			page.getByRole( 'button', { name: 'Code editor settings' } )
		).toBeVisible();
	} );

	test( 'keeps the pinned toolbar and the search panel above the code in the full-height editor', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await expect(
			page.locator( '#postdivrich.wp-editor-expand' )
		).toHaveCount( 1 );
		await page.evaluate( () => {
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).value = Array.from(
				{ length: 300 },
				( _, line ) => `<p>Line ${ line }</p>`
			).join( '\n' );
		} );
		await expect
			.poll( () =>
				page
					.locator( editor )
					.evaluate(
						( element ) => element.getBoundingClientRect().height
					)
			)
			.toBeGreaterThan( 3000 );
		// the full-height editor pins the toolbar once the page scrolls
		await page.mouse.move( 600, 500 );
		await page.mouse.wheel( 0, 2500 );
		await expect
			.poll( () =>
				page
					.locator( '#ed_toolbar' )
					.evaluate(
						( element ) => getComputedStyle( element ).position
					)
			)
			.toBe( 'fixed' );
		const boldButtonOnTop = () =>
			page.evaluate( () => {
				const button = document.getElementById( 'qt_content_strong' )!;
				const { left, top, width, height } =
					button.getBoundingClientRect();
				return (
					document.elementFromPoint(
						left + width / 2,
						top + height / 2
					) === button
				);
			} );
		expect( await boldButtonOnTop() ).toBe( true );

		await page.mouse.click( 600, 600 );
		await page.keyboard.press( 'ControlOrMeta+f' );
		const panel = page.locator( `${ editor } .cm-panels-top` );
		await expect( panel ).toBeVisible();
		const [ panelBox, toolbarBox ] = await Promise.all( [
			panel.boundingBox(),
			page.locator( '#ed_toolbar' ).boundingBox(),
		] );
		expect( panelBox!.y ).toBeGreaterThanOrEqual(
			toolbarBox!.y + toolbarBox!.height - 1
		);

		// The editor grows by the panel too, so only the page scrolls, and the
		// first line lands below the panel.
		await expect
			.poll( () =>
				page
					.locator( `${ editor } .cm-scroller` )
					.evaluate(
						( element ) =>
							element.scrollHeight > element.clientHeight
					)
			)
			.toBe( false );
		await page.mouse.click( 600, 600 );
		await page.keyboard.press( 'ControlOrMeta+Home' );
		const firstLine = page.locator( `${ editor } .cm-line`, {
			hasText: /^<p>Line 0<\/p>$/,
		} );
		await expect
			.poll( async () => {
				const [ line, panelNow ] = await Promise.all( [
					firstLine.boundingBox(),
					panel.boundingBox(),
				] );
				return (
					!! line &&
					!! panelNow &&
					line.y >= panelNow.y + panelNow.height - 1
				);
			} )
			.toBe( true );
	} );

	test( 'keeps the search panel below the bars when WordPress pins them after a scroll', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await fillLines( page, 300 );
		await page.locator( `${ editor } .cm-line` ).first().click();
		await page.keyboard.press( 'ControlOrMeta+f' );
		const field = page.locator( `${ editor } .cm-search input` ).first();
		await expect( field ).toBeFocused();
		// WordPress pins the bars in its own time: in a scroll listener that can
		// run after CodeMirror's has measured, and on timers
		await page.evaluate( () => {
			( window as unknown as WithJQuery )
				.jQuery( window )
				.off( 'scroll.editor-expand' );
			window.scrollTo( 0, 1500 );
		} );
		await nextFrames( page );
		await page.evaluate( () =>
			( window as unknown as WithJQuery )
				.jQuery( document )
				.trigger( 'editor-classchange' )
		);
		await expect.poll( () => toolbarPosition( page ) ).toBe( 'fixed' );
		await expect
			.poll( () => isOnTop( field ), { timeout: 2000 } )
			.toBe( true );
	} );

	test( 'keeps the cursor clear of the bars past the end of the full-height editor', async ( {
		page,
	} ) => {
		await page.setViewportSize( { width: 781, height: 700 } );
		// open in the Text tab: switching from the Visual one, WordPress scrolls
		// back to the top of the editor shortly after
		await page.evaluate( () => window.setUserSetting( 'editor', 'html' ) );
		await openClassicEditor( page );
		await fillLines( page, 200 );
		await page.locator( `${ editor } .cm-line` ).first().click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		// past the end of the editor WordPress parks its bars over the last lines
		await page.mouse.move( 400, 400 );
		const parked = () =>
			page
				.locator( '#ed_toolbar' )
				.evaluate(
					( element ) =>
						getComputedStyle( element ).position === 'absolute' &&
						element.getBoundingClientRect().top < 46
				);
		for ( let step = 0; step < 20 && ! ( await parked() ); step++ ) {
			await page.mouse.wheel( 0, 100 );
			await nextFrames( page );
		}
		expect( await parked() ).toBe( true );

		// as the cursor goes up, the page scrolls back and the bars come down
		const hidden: number[] = [];
		for ( let step = 1; step <= 25; step++ ) {
			await page.keyboard.press( 'ArrowUp' );
			await nextFrames( page );
			const shows = await page
				.locator( `${ editor } .cm-cursor-primary` )
				.evaluate( ( cursor ) => {
					const { left, top, height } =
						cursor.getBoundingClientRect();
					return !! document
						.elementFromPoint( left + 1, top + height / 2 )
						?.closest( '.hesh-classic-editor' );
				} );
			if ( ! shows ) {
				hidden.push( step );
			}
		}
		expect( hidden ).toEqual( [] );
	} );

	test( 'fits the full-height editor to the code', async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 800 } );
		// long lines that wrap, which CodeMirror first guesses taller than they are
		const pageId = await page.evaluate(
			async ( content ) =>
				(
					await wp.apiFetch< { id: number } >( {
						path: '/wp/v2/pages',
						method: 'POST',
						data: { title: 'Long lines', content, status: 'draft' },
					} )
				).id,
			Array.from(
				{ length: 20 },
				( _, row ) => `<p>${ 'words '.repeat( 96 ) }${ row }</p>`
			).join( '\n\n' )
		);
		// open in the Text tab, sized as the page loads
		await page.evaluate( () => window.setUserSetting( 'editor', 'html' ) );
		await openClassicEditor(
			page,
			`/wp-admin/post.php?post=${ pageId }&action=edit`
		);
		// at the end, where CodeMirror has measured the lines
		await page.locator( `${ editor } .cm-line` ).first().click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		const blankBelowCode = () =>
			page.evaluate( () => {
				const editorElement = document.querySelector(
					'.hesh-classic-editor'
				)!;
				const lines = editorElement.querySelectorAll( '.cm-line' );
				return Math.round(
					editorElement.getBoundingClientRect().bottom -
						lines[ lines.length - 1 ].getBoundingClientRect().bottom
				);
			} );
		await expect.poll( blankBelowCode ).toBeLessThan( 40 );

		// and again once the search panel has closed
		await page.keyboard.press( 'ControlOrMeta+f' );
		await expect( page.locator( `${ editor } .cm-search` ) ).toBeVisible();
		await page.keyboard.press( 'Escape' );
		await expect( page.locator( `${ editor } .cm-search` ) ).toHaveCount(
			0
		);
		await expect.poll( blankBelowCode ).toBeLessThan( 40 );
	} );

	test( 'keeps the search panel below the admin bar and plugin menus above the code without the full-height editor', async ( {
		page,
	} ) => {
		await page.evaluate( () =>
			window.setUserSetting( 'editor_expand', 'off' )
		);
		try {
			await page.setViewportSize( { width: 1400, height: 480 } );
			await openClassicEditor( page );
			await expect(
				page.locator( '#postdivrich.wp-editor-expand' )
			).toHaveCount( 0 );
			await page.evaluate( () => {
				(
					document.getElementById( 'content' ) as HTMLTextAreaElement
				 ).value = Array.from(
					{ length: 100 },
					( _, line ) => `<p>Line ${ line }</p>`
				).join( '\n' );
			} );

			// a plugin's menu dropping down from the media buttons, over the code
			const menuOnTop = await page.evaluate( () => {
				const menu = document.createElement( 'div' );
				menu.id = 'hesh-test-menu';
				Object.assign( menu.style, {
					position: 'absolute',
					top: '100%',
					left: '0',
					width: '200px',
					height: '160px',
					background: '#fff',
				} );
				document
					.getElementById( 'wp-content-media-buttons' )!
					.append( menu );
				const { left, bottom } = menu.getBoundingClientRect();
				const onTop =
					document.elementFromPoint( left + 100, bottom - 20 ) ===
					menu;
				menu.remove();
				return onTop;
			} );
			expect( menuOnTop ).toBe( true );

			// the top of the editor scrolled up under the admin bar
			await page.evaluate( () =>
				window.scrollBy(
					0,
					document
						.querySelector( '.hesh-classic-editor' )!
						.getBoundingClientRect().top + 100
				)
			);
			await page.mouse.click( 600, 120 );
			await page.keyboard.press( 'ControlOrMeta+f' );
			const field = page
				.locator( `${ editor } .cm-search input` )
				.first();
			await expect( field ).toBeFocused();
			const fieldVisible = () =>
				field.evaluate( ( element ) => {
					const { left, top, width, height } =
						element.getBoundingClientRect();
					return (
						document.elementFromPoint(
							left + width / 2,
							top + height / 2
						) === element
					);
				} );
			await expect.poll( fieldVisible ).toBe( true );
		} finally {
			// saved with the next page load
			await page.evaluate( () =>
				window.setUserSetting( 'editor_expand', 'on' )
			);
			await page.goto( '/wp-admin/post-new.php?post_type=page' );
		}
	} );

	test( 'doesn’t scroll the page while typing in a short full-height editor', async ( {
		page,
	} ) => {
		await page.setViewportSize( { width: 1400, height: 600 } );
		await openClassicEditor( page );
		await page.evaluate( () => {
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).value = '<p>One</p>\n<p>Two</p>\n<p>Three</p>';
		} );
		// the first line just below the admin bar: WordPress doesn't pin the
		// editor's bars for an editor this short
		const firstLine = page.locator( `${ editor } .cm-line` ).first();
		await firstLine.evaluate( ( line ) =>
			window.scrollBy( 0, line.getBoundingClientRect().top - 90 )
		);
		await expect( page.locator( '#ed_toolbar' ) ).not.toHaveCSS(
			'position',
			'fixed'
		);
		const scrolled = await page.evaluate( () => window.scrollY );
		expect( scrolled ).toBeGreaterThan( 0 );
		await firstLine.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.type( 'x' );
		await expect
			.poll( () => textareaValue( page ) )
			.toContain( 'One</p>x' );
		expect( await page.evaluate( () => window.scrollY ) ).toBe( scrolled );
	} );

	test( 'brings back the cursor in view after a reload in the full-height editor', async ( {
		page,
	} ) => {
		const pageId = await page.evaluate(
			async ( content ) =>
				(
					await wp.apiFetch< { id: number } >( {
						path: '/wp/v2/pages',
						method: 'POST',
						data: { title: 'Long page', content, status: 'draft' },
					} )
				).id,
			Array.from(
				{ length: 400 },
				( _, row ) => `<p>row ${ row }</p>`
			).join( '\n' )
		);
		// open in the Text tab, without a trip through the Visual one rewriting the code
		await page.evaluate( () => window.setUserSetting( 'editor', 'html' ) );
		await openClassicEditor(
			page,
			`/wp-admin/post.php?post=${ pageId }&action=edit`
		);
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+Alt+g' );
		await page.keyboard.type( '250' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'End' );
		const line = page.locator( `${ editor } .cm-line`, {
			hasText: /^<p>row 249<\/p>$/,
		} );
		await expect( line ).toBeInViewport();
		// the position is saved shortly after the cursor moves
		await expect
			.poll( () =>
				page.evaluate(
					( id ) =>
						JSON.parse(
							localStorage.getItem( `hesh-selection-${ id }` ) ??
								'{}'
						).head,
					pageId
				)
			)
			.toBe(
				( await textareaValue( page ) ).indexOf( '<p>row 250</p>' ) - 1
			);

		await page.reload();
		await expect( codeMirror( page, editor ) ).toBeVisible();
		await expect( line ).toBeInViewport();
		// and stays there once the editor has settled
		await page.waitForTimeout( 1000 );
		await expect( line ).toBeInViewport();
	} );

	test( 'undo doesn’t reach back across a visit to the Visual tab', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Round trip</p>' );
		await page.click( '#content-tmce' );
		await expect( page.locator( editor ) ).toBeHidden();
		await page.click( '#content-html' );
		await expect( codeMirror( page, editor ) ).toBeVisible();
		const content = await textareaValue( page );
		expect( content ).toContain( 'Round trip' );

		// Switching rewrote the content with TinyMCE's bookmark markup in
		// between. Undo still takes back what is typed after, then stops.
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		await page.keyboard.type( 'x' );
		await page.keyboard.press( 'ControlOrMeta+z' );
		expect( await textareaValue( page ) ).toBe( content );
		await page.keyboard.press( 'ControlOrMeta+z' );
		await page.keyboard.press( 'ControlOrMeta+z' );
		expect( await textareaValue( page ) ).toBe( content );

		// the same for a script that switches there and back in one go
		await page.evaluate( () => {
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).setSelectionRange( 8, 8 );
			window.switchEditors.go( 'content', 'tmce' );
			window.switchEditors.go( 'content', 'html' );
		} );
		const switched = await textareaValue( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+z' );
		expect( await textareaValue( page ) ).toBe( switched );
	} );

	test( 'Emacs key bindings work in the built plugin', async ( { page } ) => {
		await saveSettings( page, { keyMap: 'emacs' } );
		await openClassicEditor( page );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( 'abc def' );
		// C-x h selects everything, so the next key replaces it
		await page.keyboard.press( 'Control+x' );
		await page.keyboard.press( 'h' );
		await page.keyboard.type( 'Z' );
		await expect.poll( () => textareaValue( page ) ).toBe( 'Z' );
		// C-k and C-y run commands the package registers by name
		await page.keyboard.press( 'Control+a' );
		await page.keyboard.press( 'Control+k' );
		await expect.poll( () => textareaValue( page ) ).toBe( '' );
		await page.keyboard.press( 'Control+y' );
		await expect.poll( () => textareaValue( page ) ).toBe( 'Z' );
	} );

	test( 'types [ and \\ with AltGr on Windows', async ( { page } ) => {
		// CodeMirror reads the platform when it loads
		await page.addInitScript( () => {
			Object.defineProperty( Navigator.prototype, 'platform', {
				get: () => 'Win32',
			} );
		} );
		await openClassicEditor( page );
		// code that folds, which AltGr+[ (Ctrl+Alt+[, fold all) would do
		await page.evaluate( () => {
			(
				document.getElementById( 'content' ) as HTMLTextAreaElement
			 ).value = '<div>\n\t<p>a</p>\n</div>';
		} );
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		// Windows reports AltGr as Ctrl+Alt; the keys of a German keyboard. The
		// key goes in without its text, which Chromium types for a key with Ctrl
		// held on some systems and not on others: the test types it, as the
		// browser would, unless CodeMirror took the key.
		await page.evaluate( () => {
			window.addEventListener( 'keydown', ( event ) => {
				window.heshKeyTaken = event.defaultPrevented;
			} );
		} );
		const cdp = await page.context().newCDPSession( page );
		const send = (
			type: 'rawKeyDown' | 'keyUp',
			key: string,
			code: string,
			vk: number,
			modifiers: number
		) =>
			cdp.send( 'Input.dispatchKeyEvent', {
				type,
				key,
				code,
				windowsVirtualKeyCode: vk,
				modifiers,
			} );
		for ( const [ key, code, vk ] of [
			[ '[', 'Digit8', 56 ],
			[ '\\', 'Minus', 219 ],
			[ ']', 'Digit9', 57 ],
		] as const ) {
			await send( 'rawKeyDown', 'Control', 'ControlLeft', 17, 2 );
			await send( 'rawKeyDown', 'AltGraph', 'AltRight', 18, 3 );
			await send( 'rawKeyDown', key, code, vk, 3 );
			if ( ! ( await page.evaluate( () => window.heshKeyTaken ) ) ) {
				await cdp.send( 'Input.insertText', { text: key } );
			}
			await send( 'keyUp', key, code, vk, 3 );
			await send( 'keyUp', 'AltGraph', 'AltRight', 18, 2 );
			await send( 'keyUp', 'Control', 'ControlLeft', 17, 0 );
		}
		await expect
			.poll( () => textareaValue( page ) )
			.toBe( '<div>\n\t<p>a</p>\n</div>[\\]' );
		await expect(
			page.locator( `${ editor } .cm-foldPlaceholder` )
		).toHaveCount( 0 );
	} );

	test( 'lays code out left to right in right-to-left languages', async ( {
		page,
	} ) => {
		await page.addInitScript( () => {
			document.addEventListener( 'DOMContentLoaded', () => {
				document.documentElement.dir = 'rtl';
			} );
		} );
		await openClassicEditor( page );
		const layout = await page.evaluate( () => {
			const content = document.querySelector(
				'.hesh-classic-editor .cm-content'
			)!;
			const gutters = document.querySelector(
				'.hesh-classic-editor .cm-gutters'
			)!;
			return {
				direction: getComputedStyle( content ).direction,
				gutterOnTheLeft:
					gutters.getBoundingClientRect().left <
					content.getBoundingClientRect().left,
			};
		} );
		expect( layout ).toEqual( { direction: 'ltr', gutterOnTheLeft: true } );
	} );

	test( 'shows the cursor clearly in the Eclipse and Solarized Dark themes', async ( {
		page,
	} ) => {
		for ( const [ theme, caret ] of [
			[ 'eclipse', 'rgb(0, 0, 0)' ],
			[ 'solarized-dark', 'rgb(147, 161, 161)' ],
		] ) {
			await saveSettings( page, { theme } );
			await openClassicEditor( page );
			await codeMirror( page, editor ).click();
			await expect
				.poll( () =>
					page
						.locator( `${ editor } .cm-cursor` )
						.first()
						.evaluate(
							( element ) =>
								getComputedStyle( element ).borderLeftColor
						)
				)
				.toBe( caret );
		}
	} );
} );

test( 'the theme and plugin file editors keep core’s editor', async ( {
	page,
} ) => {
	await page.goto(
		'/wp-admin/plugin-editor.php?plugin=html-editor-syntax-highlighter/html-editor-syntax-highlighter.php'
	);
	await expect( page.locator( '#template .CodeMirror' ) ).toBeVisible();
	await expect( page.locator( '.cm-editor' ) ).toHaveCount( 0 );
} );
