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

	test( 'Backspace deletes an empty pair only with Auto-close brackets on', async ( {
		page,
	} ) => {
		await setEditorMode( page, 'text' );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<a href=""' );
		await page.keyboard.press( 'ArrowLeft' );
		await page.keyboard.press( 'Backspace' );
		await expect.poll( () => editedContent( page ) ).toBe( '<a href="' );

		await page
			.getByRole( 'button', { name: 'Code editor settings' } )
			.click();
		await page.getByLabel( 'Auto-close brackets and quotes' ).check();
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+a' );
		await page.keyboard.press( 'Backspace' );
		await page.keyboard.type( '<a href="' );
		await expect.poll( () => editedContent( page ) ).toBe( '<a href=""' );
		await page.keyboard.press( 'Backspace' );
		await expect.poll( () => editedContent( page ) ).toBe( '<a href=' );
	} );

	test( 'undo in the search panel leaves the post alone', async ( {
		page,
	} ) => {
		await setEditorMode( page, 'text' );
		await codeMirror( page, editor ).click();
		await page.keyboard.type( '<p>one</p>' );
		await page.waitForTimeout( 600 ); // a separate undo step
		await page.keyboard.type( ' two' );
		await expect
			.poll( () => editedContent( page ) )
			.toBe( '<p>one</p> two' );

		await page.keyboard.press( 'ControlOrMeta+f' );
		const search = page.locator(
			`${ editor } .cm-search input[name="search"]`
		);
		await expect( search ).toBeFocused();
		await page.keyboard.type( 'onx' );
		await page.keyboard.press( 'ControlOrMeta+z' );
		// the search field undid its own typing, the post did not change
		await expect( search ).not.toHaveValue( 'onx' );
		expect( await editedContent( page ) ).toBe( '<p>one</p> two' );
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
		await openBlockEditor( page );
		await setEditorMode( page, 'text' );
		await page.locator( 'textarea.editor-post-text-editor' ).click();
		await page.keyboard.type( 'typed while loading' );

		await expect( codeMirror( page, editor ) ).toBeVisible();
		await expect( codeMirror( page, editor ) ).toHaveText(
			'typed while loading'
		);
		expect( await editedContent( page ) ).toBe( 'typed while loading' );
	} );

	test( 'keeps the post and its template apart', async ( { page } ) => {
		// an unedited post, so neither it nor its template has edits
		const postId = await page.evaluate(
			async () =>
				(
					await wp.apiFetch< { id: number } >( {
						path: '/wp/v2/posts',
						method: 'POST',
						data: {
							title: 'Post and template',
							content: '<p>Post content</p>',
							status: 'draft',
						},
					} )
				).id
		);
		await openBlockEditor(
			page,
			`/wp-admin/post.php?post=${ postId }&action=edit`
		);
		await setEditorMode( page, 'text' );
		await expect( codeMirror( page, editor ) ).toHaveText(
			'<p>Post content</p>'
		);

		// Edit template and come back without leaving code view. WordPress 7
		// keeps the same textarea for the post and its template.
		await page.evaluate( () =>
			wp.data
				.dispatch( 'core/edit-post' )
				.openGeneralSidebar( 'edit-post/document' )
		);
		await page.getByRole( 'button', { name: 'Template options' } ).click();
		await page.getByRole( 'menuitem', { name: 'Edit template' } ).click();
		await expect
			.poll( () =>
				page.evaluate( () =>
					wp.data.select( 'core/editor' ).getCurrentPostType()
				)
			)
			.toBe( 'wp_template' );
		await expect( codeMirror( page, editor ) ).toContainText(
			'wp:template-part'
		);
		await page
			.getByRole( 'button', { name: /^(Back|Go back)/ } )
			.first()
			.click();
		await expect
			.poll( () =>
				page.evaluate( () =>
					wp.data.select( 'core/editor' ).getCurrentPostType()
				)
			)
			.toBe( 'post' );

		await expect( codeMirror( page, editor ) ).toHaveText(
			'<p>Post content</p>'
		);
		await codeMirror( page, editor ).click();
		await page.keyboard.press( 'ControlOrMeta+End' );
		await page.keyboard.type( '!' );
		await expect
			.poll( () => editedContent( page ) )
			.toBe( '<p>Post content</p>!' );
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

	test( 'saves a setting changed just before leaving the page', async ( {
		page,
	} ) => {
		await setEditorMode( page, 'text' );
		await expect( codeMirror( page, editor ) ).toBeVisible();
		await page
			.getByRole( 'button', { name: 'Code editor settings' } )
			.click();
		await page.getByLabel( 'Theme' ).selectOption( 'nord' );
		// gone well before the 500ms the settings wait for more changes
		await page.goto( 'about:blank' );

		await openBlockEditor( page );
		await expect
			.poll( async () => ( await getState( page ) ).meta.hesh_settings )
			.toMatchObject( { theme: 'nord' } );
	} );

	test( 'opens with the default theme and keys when their chunks fail to load', async ( {
		page,
	} ) => {
		await saveSettings( page, { theme: 'dracula', keyMap: 'vim' } );
		await page.route(
			/\/build\/(theme-dracula|keymap-vim)\.js/,
			( route ) => route.abort()
		);
		await openBlockEditor( page );
		await setEditorMode( page, 'text' );

		await expect( codeMirror( page, editor ) ).toBeVisible();
		// the bundled WordPress theme
		await expect
			.poll( () =>
				page
					.locator( `${ editor } .cm-editor` )
					.evaluate(
						( element ) =>
							getComputedStyle( element ).backgroundColor
					)
			)
			.toBe( 'rgb(42, 48, 54)' );
		// default keys, in Vim's normal mode x, y and z would not insert text
		await codeMirror( page, editor ).click();
		await page.keyboard.type( 'xyz' );
		await expect.poll( () => editedContent( page ) ).toBe( 'xyz' );
		// the settings are there to pick something else
		await expect(
			page.getByRole( 'button', { name: 'Code editor settings' } )
		).toBeVisible();
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
					surveyNoticeDismissedB: '1',
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
