import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
vi.mock( '@wordpress/api-fetch', () => ( { default: apiFetch } ) );

let pagehide: () => void;

// the store reads window.heshConfig and listens for pagehide when it loads
async function loadStore() {
	vi.resetModules();
	vi.stubGlobal( 'window', {
		heshConfig: { settings: { theme: 'wordpress' }, postId: 1 },
		addEventListener: ( type: string, listener: () => void ) => {
			if ( type === 'pagehide' ) {
				pagehide = listener;
			}
		},
	} );
	return import( './store' );
}

const sentThemes = () =>
	apiFetch.mock.calls.map(
		( [ options ] ) => options.data.meta.hesh_settings.theme
	);

describe( 'settings store', () => {
	beforeEach( () => {
		vi.useFakeTimers();
		apiFetch.mockReset();
		apiFetch.mockResolvedValue( {} );
	} );

	afterEach( () => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	} );

	it( 'saves a burst of changes once, with the latest settings', async () => {
		const store = await loadStore();
		store.updateSettings( { theme: 'nord' } );
		store.updateSettings( { theme: 'dracula' } );
		expect( apiFetch ).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync( 500 );
		expect( sentThemes() ).toEqual( [ 'dracula' ] );
		expect( store.getState().status ).toBe( 'saved' );
	} );

	it( 'starts a save only after the one before has finished', async () => {
		const store = await loadStore();
		let finishFirst = () => {};
		apiFetch.mockImplementationOnce(
			() =>
				new Promise(
					( resolve ) => ( finishFirst = () => resolve( {} ) )
				)
		);
		store.updateSettings( { theme: 'nord' } );
		await vi.advanceTimersByTimeAsync( 500 );
		store.updateSettings( { theme: 'dracula' } );
		await vi.advanceTimersByTimeAsync( 500 );
		store.updateSettings( { theme: 'monokai' } );
		await vi.advanceTimersByTimeAsync( 500 );
		// the first request is still running
		expect( sentThemes() ).toEqual( [ 'nord' ] );
		finishFirst();
		await vi.runAllTimersAsync();
		// the waiting saves became one, with the latest settings
		expect( sentThemes() ).toEqual( [ 'nord', 'monokai' ] );
		expect( store.getState().status ).toBe( 'saved' );
	} );

	it( 'sends a waiting save when the page goes away', async () => {
		const store = await loadStore();
		store.updateSettings( { theme: 'nord' } );
		pagehide();
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
		expect( apiFetch.mock.calls[ 0 ][ 0 ] ).toMatchObject( {
			path: '/wp/v2/users/me',
			method: 'POST',
			keepalive: true,
		} );
		expect( sentThemes() ).toEqual( [ 'nord' ] );
		// and not again when the timer would have fired
		await vi.runAllTimersAsync();
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'sends nothing on pagehide when everything is saved', async () => {
		const store = await loadStore();
		store.updateSettings( { theme: 'nord' } );
		await vi.advanceTimersByTimeAsync( 500 );
		pagehide();
		expect( sentThemes() ).toEqual( [ 'nord' ] );
	} );

	it( 'shows an error and saves again after a failed save', async () => {
		const store = await loadStore();
		apiFetch.mockRejectedValueOnce( new Error( 'offline' ) );
		store.updateSettings( { theme: 'nord' } );
		await vi.advanceTimersByTimeAsync( 500 );
		expect( store.getState().status ).toBe( 'error' );
		await store.save();
		expect( sentThemes() ).toEqual( [ 'nord', 'nord' ] );
		expect( store.getState().status ).toBe( 'saved' );
	} );
} );
