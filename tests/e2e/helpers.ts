import { expect, type Page } from '@playwright/test';

export const settingsDefaults = {
	theme: 'wordpress',
	keyMap: 'default',
	tabSize: 4,
	fontSize: 13,
	lineHeight: 1.5,
	lineWrapping: true,
	lineNumbers: true,
	foldGutter: false,
	matchBrackets: false,
	highlightSelectionMatches: false,
	autoCloseTags: false,
	autoCloseBrackets: false,
};

export interface TestState {
	meta: Record< string, unknown >;
	wpVersion: string;
	phpVersion: string;
}

// The user's hesh_* meta and the site's versions, from the e2e mu-plugin.
export function getState( page: Page ): Promise< TestState > {
	return page.evaluate( () =>
		wp.apiFetch< TestState >( { path: '/hesh-e2e/v1/state' } )
	);
}

// Saves settings the way the settings panel does.
export async function saveSettings(
	page: Page,
	settings: Record< string, unknown >
) {
	await page.evaluate(
		( meta ) =>
			wp.apiFetch( {
				path: '/wp/v2/users/me',
				method: 'POST',
				data: { meta: { hesh_settings: meta } },
			} ),
		{ ...settingsDefaults, ...settings }
	);
}

// accept "leave page?" prompts, the tests leave posts unsaved
export function acceptDialogs( page: Page ) {
	page.on( 'dialog', ( dialog ) => dialog.accept() );
}

// Opens a block editor post, without the welcome guide.
export async function openBlockEditor(
	page: Page,
	path = '/wp-admin/post-new.php'
) {
	acceptDialogs( page );
	await page.goto( path );
	await page.waitForFunction( () =>
		wp.data?.select( 'core/editor' )?.getCurrentPostId()
	);
	await page.evaluate( () => {
		// the post editor's scope, and the shared one newer versions use
		for ( const scope of [ 'core/edit-post', 'core' ] ) {
			wp.data
				.dispatch( 'core/preferences' )
				.set( scope, 'welcomeGuide', false );
		}
	} );
	const guide = page.locator( '.components-modal__screen-overlay' );
	if ( await guide.count() ) {
		await page.keyboard.press( 'Escape' );
	}
	await expect( guide ).toHaveCount( 0 );
}

// Switches the block editor between `visual` and `text` (code) mode, WordPress 6.5 and later.
export async function setEditorMode( page: Page, mode: 'visual' | 'text' ) {
	await page.evaluate( ( nextMode ) => {
		const editor = wp.data.dispatch( 'core/editor' );
		( editor.switchEditorMode
			? editor
			: wp.data.dispatch( 'core/edit-post' )
		).switchEditorMode( nextMode );
	}, mode );
}

export function editedContent( page: Page ): Promise< string > {
	return page.evaluate( () =>
		wp.data.select( 'core/editor' ).getEditedPostContent()
	);
}

// Replaces the post content from outside CodeMirror, like core's code editor textarea.
export async function setPostContent( page: Page, content: string ) {
	await page.evaluate( ( nextContent ) => {
		const editor = wp.data.select( 'core/editor' );
		wp.data
			.dispatch( 'core' )
			.editEntityRecord(
				'postType',
				editor.getCurrentPostType(),
				editor.getCurrentPostId(),
				{
					content: nextContent,
					blocks: undefined,
					selection: undefined,
				}
			);
	}, content );
}

export const codeMirror = ( page: Page, scope: string ) =>
	page.locator( `${ scope } .cm-content` );

// Text of the visible CodeMirror lines.
export async function codeMirrorText( page: Page, scope: string ) {
	return (
		await page.locator( `${ scope } .cm-line` ).allTextContents()
	).join( '\n' );
}

// Colour of the first highlighted token with this text.
export async function tokenColor( page: Page, scope: string, text: string ) {
	const token = page
		.locator( `${ scope } .cm-line span`, {
			hasText: new RegExp( `^${ text }$` ),
		} )
		.first();
	await expect( token ).toBeVisible();
	return token.evaluate( ( element ) => getComputedStyle( element ).color );
}
