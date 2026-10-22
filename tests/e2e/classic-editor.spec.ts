import { expect, test, type Page } from '@playwright/test';
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

test.describe( 'Classic editor Text tab', () => {
	test.beforeEach( async ( { page } ) => {
		acceptDialogs( page );
		await page.goto( '/wp-admin/post-new.php?post_type=page' );
		await page.waitForFunction(
			() => typeof wp !== 'undefined' && !! wp.apiFetch
		);
		await saveSettings( page, {} );
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

	test( 'saves with Ctrl+S and restores the cursor after reloading', async ( {
		page,
	} ) => {
		await openClassicEditor( page );
		await page.fill( '#title', 'Classic test' );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Saved from CodeMirror</p>' );
		await page.keyboard.press( 'ArrowLeft' );
		const cursor = await page.evaluate(
			() =>
				( document.getElementById( 'content' ) as HTMLTextAreaElement )
					.selectionStart
		);

		await Promise.all( [
			page.waitForURL( /post\.php\?post=\d+&action=edit/ ),
			page.keyboard.press( 'ControlOrMeta+s' ),
		] );
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
