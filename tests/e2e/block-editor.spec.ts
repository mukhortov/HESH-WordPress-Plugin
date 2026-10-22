import { expect, test } from '@playwright/test';
import {
	codeMirror,
	codeMirrorText,
	editedContent,
	getState,
	openBlockEditor,
	saveSettings,
	setEditorMode,
	setPostContent,
	tokenColor,
} from './helpers';

const editor = '.hesh-block-editor';

test.describe( 'block editor Code Editor', () => {
	test.beforeEach( async ( { page } ) => {
		await openBlockEditor( page );
		await saveSettings( page, {} );
	} );

	test.afterEach( async ( { page } ) => {
		// the editor mode is a saved preference, leave the next test in the visual editor
		await setEditorMode( page, 'visual' );
	} );

	test( 'runs on the expected WordPress and PHP versions', async ( {
		page,
	}, testInfo ) => {
		const { wpVersion, phpVersion } = await getState( page );
		if ( testInfo.project.name === 'wp-6.5' ) {
			expect( wpVersion ).toMatch( /^6\.5(\.|$)/ );
			expect( phpVersion ).toMatch( /^7\.4\./ );
		} else {
			expect( Number.parseFloat( wpVersion ) ).toBeGreaterThan( 6.5 );
		}
	} );

	test( 'replaces the code editor textarea and highlights shortcodes', async ( {
		page,
	} ) => {
		await setPostContent(
			page,
			'<p class="intro">Hi [gallery ids="1,2"]</p>\n[/matchless]'
		);
		await setEditorMode( page, 'text' );

		await expect( codeMirror( page, editor ) ).toBeVisible();
		await expect(
			page.locator( 'textarea.editor-post-text-editor' )
		).toBeHidden();
		await expect( page.locator( editor ) ).toHaveCount( 1 );
		// the wordpress theme colours HTML and shortcode tag names alike
		expect( await tokenColor( page, editor, 'gallery' ) ).toBe(
			'rgb(0, 183, 255)'
		);
		expect( await tokenColor( page, editor, 'p' ) ).toBe(
			'rgb(0, 183, 255)'
		);
		expect( await tokenColor( page, editor, '"1,2"' ) ).toBe(
			'rgb(250, 149, 109)'
		);
		await expect(
			page.locator( `${ editor } .cm-hesh-unmatchedTag` )
		).toHaveText( '[/matchless]' );
	} );

	test( 'writes every change to the post and keeps it in the visual editor', async ( {
		page,
	} ) => {
		await setEditorMode( page, 'text' );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>Typed in CodeMirror</p>' );
		await expect
			.poll( () => editedContent( page ) )
			.toBe( '<p>Typed in CodeMirror</p>' );

		// switching back straight away, like with the keyboard shortcut
		await setEditorMode( page, 'visual' );
		await expect
			.poll( () =>
				page.evaluate( () =>
					wp.data
						.select( 'core/block-editor' )
						.getBlocks()
						.map(
							( block: { attributes: { content?: unknown } } ) =>
								String( block.attributes.content )
						)
				)
			)
			.toEqual( [ '<p>Typed in CodeMirror</p>' ] );
	} );

	test( 'brings in changes made outside CodeMirror', async ( { page } ) => {
		await setPostContent( page, '<p>one</p>' );
		await setEditorMode( page, 'text' );
		await expect( codeMirror( page, editor ) ).toHaveText( '<p>one</p>' );

		await setPostContent( page, '<p>two</p>' );
		await expect( codeMirror( page, editor ) ).toHaveText( '<p>two</p>' );

		// the toolbar undo button
		await page
			.locator(
				'.editor-history__undo, .edit-post-header-toolbar__undo, button[aria-label="Undo"]'
			)
			.first()
			.click();
		await expect.poll( () => editedContent( page ) ).toBe( '<p>one</p>' );
		await expect( codeMirror( page, editor ) ).toHaveText( '<p>one</p>' );
	} );

	test( 'keeps undo inside CodeMirror', async ( { page } ) => {
		await setPostContent( page, '<p>before</p>' );
		await setEditorMode( page, 'text' );
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		await page.keyboard.type( '\n<p>after</p>' );
		await expect
			.poll( () => editedContent( page ) )
			.toBe( '<p>before</p>\n<p>after</p>' );

		await page.keyboard.press( 'ControlOrMeta+z' );
		// CodeMirror undid the typing, the block editor did not also undo the earlier edit
		await expect
			.poll( () => editedContent( page ) )
			.toBe( '<p>before</p>' );
		await expect( codeMirror( page, editor ) ).toHaveText(
			'<p>before</p>'
		);
	} );

	test( 'starts when a post opens in code view, and saves with Ctrl+S', async ( {
		page,
	} ) => {
		await setPostContent(
			page,
			'<!-- wp:paragraph -->\n<p>saved [shortcode]</p>\n<!-- /wp:paragraph -->'
		);
		await setEditorMode( page, 'text' );
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+s' );
		await expect
			.poll( () =>
				page.evaluate(
					() => ! wp.data.select( 'core/editor' ).isEditedPostDirty()
				)
			)
			.toBe( true );
		const postId = await page.evaluate( () =>
			wp.data.select( 'core/editor' ).getCurrentPostId()
		);

		await openBlockEditor(
			page,
			`/wp-admin/post.php?post=${ postId }&action=edit`
		);
		await expect( codeMirror( page, editor ) ).toBeVisible();
		expect( await codeMirrorText( page, editor ) ).toContain(
			'<p>saved [shortcode]</p>'
		);
	} );

	test( 'applies and saves settings', async ( { page } ) => {
		await setEditorMode( page, 'text' );
		await expect( codeMirror( page, editor ) ).toBeVisible();
		await page
			.getByRole( 'button', { name: 'Code editor settings' } )
			.click();
		await page.getByLabel( 'Theme' ).selectOption( 'dracula' );
		await page.getByLabel( 'Line numbers' ).uncheck();
		await expect(
			page.locator( `${ editor } .cm-lineNumbers` )
		).toHaveCount( 0 );
		await expect
			.poll( () =>
				page
					.locator( `${ editor } .cm-editor` )
					.evaluate(
						( element ) =>
							getComputedStyle( element ).backgroundColor
					)
			)
			.toBe( 'rgb(40, 42, 54)' );

		await expect
			.poll( async () => ( await getState( page ) ).meta.hesh_settings )
			.toMatchObject( { theme: 'dracula', lineNumbers: false } );
	} );

	test( 'moves 2.x settings into hesh_settings', async ( { page } ) => {
		await page.evaluate( () =>
			wp.apiFetch( {
				path: '/hesh-e2e/v1/legacy-settings',
				method: 'POST',
				data: {
					theme: 'cobalt',
					keyMap: 'sublime',
					lineNumbers: '',
					lineWrapping: '1',
					matchTags: '1',
					fontSize: '16',
					lineHeight: '1.25',
					scrollbarStyle: '1',
				},
			} )
		);
		await openBlockEditor( page );
		expect(
			await page.evaluate( () => window.heshConfig?.settings )
		).toMatchObject( {
			theme: 'wordpress',
			keyMap: 'vscode',
			lineNumbers: false,
			lineWrapping: true,
			matchBrackets: true,
			fontSize: 16,
			lineHeight: 1.25,
		} );
		const { meta } = await getState( page );
		expect( Object.keys( meta ) ).toEqual( [ 'hesh_settings' ] );
	} );
} );
