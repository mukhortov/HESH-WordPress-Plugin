import { expect, test } from '@playwright/test';
import { getState, openBlockEditor, saveSettings } from './helpers';

test( 'uninstall.php removes the settings of every user, and nothing else', async ( {
	page,
} ) => {
	await openBlockEditor( page );
	const other = await page.evaluate(
		async () =>
			(
				await wp.apiFetch< { id: number } >( {
					path: '/wp/v2/users',
					method: 'POST',
					data: {
						username: `uninstall-${ Date.now() }`,
						email: `uninstall-${ Date.now() }@example.test`,
						password: `unused-${ Math.random() }`,
					},
				} )
			).id
	);
	// 3.0 settings for the admin, 2.x settings and the 2.x survey key for the
	// other user, and a hesh_ key that isn't the plugin's for both
	await saveSettings( page, { theme: 'nord' } );
	await page.evaluate(
		( [ userId ] ) =>
			Promise.all( [
				wp.apiFetch( {
					path: `/hesh-e2e/v1/legacy-settings?user=${ userId }`,
					method: 'POST',
					data: {
						theme: 'cobalt',
						keyMap: 'sublime',
						surveyNoticeDismissedB: '1',
						unrelated: 'keep',
					},
				} ),
			] ),
		[ other ]
	);
	expect(
		Object.keys(
			(
				await page.evaluate(
					( userId ) =>
						wp.apiFetch< { meta: object } >( {
							path: `/hesh-e2e/v1/state?user=${ userId }`,
						} ),
					other
				)
			).meta
		).sort()
	).toEqual( [
		'hesh_keyMap',
		'hesh_surveyNoticeDismissedB',
		'hesh_theme',
		'hesh_unrelated',
	] );

	await page.evaluate( () =>
		wp.apiFetch( { path: '/hesh-e2e/v1/uninstall', method: 'POST' } )
	);

	// PHP sends an empty array, compare the keys
	expect( Object.keys( ( await getState( page ) ).meta ) ).toEqual( [] );
	expect(
		(
			await page.evaluate(
				( userId ) =>
					wp.apiFetch< { meta: object } >( {
						path: `/hesh-e2e/v1/state?user=${ userId }`,
					} ),
				other
			)
		).meta
	).toEqual( { hesh_unrelated: 'keep' } );
} );
