import apiFetch from '@wordpress/api-fetch';
import { getConfig } from '../config';
import { normalizeSettings, type Settings } from './settings';

/**
 * The current user's settings, shared by the editor and the settings panel.
 * Changes apply straight away and are saved to the `hesh_settings` user meta.
 */

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface SettingsState {
	settings: Settings;
	status: SaveStatus;
}

type Listener = ( state: SettingsState ) => void;

let state: SettingsState = {
	settings: normalizeSettings( getConfig().settings ),
	status: 'saved',
};
const listeners = new Set< Listener >();
let saveTimer: ReturnType< typeof setTimeout > | undefined;
// the settings of the last request sent, null after a failed one
let lastSent: Settings | null = state.settings;
let queue: Promise< void > = Promise.resolve();

export function getState(): SettingsState {
	return state;
}

export function getSettings(): Settings {
	return state.settings;
}

export function subscribe( listener: Listener ): () => void {
	listeners.add( listener );
	return () => listeners.delete( listener );
}

function setState( next: Partial< SettingsState > ): void {
	state = { ...state, ...next };
	listeners.forEach( ( listener ) => listener( state ) );
}

export function updateSettings( changes: Partial< Settings > ): void {
	setState( {
		settings: normalizeSettings( { ...state.settings, ...changes } ),
		status: 'saving',
	} );
	// a burst of changes, like stepping through themes, is saved once
	clearTimeout( saveTimer );
	saveTimer = setTimeout( save, 500 );
}

function request( settings: Settings, keepalive = false ): Promise< unknown > {
	return apiFetch( {
		path: '/wp/v2/users/me',
		method: 'POST',
		data: { meta: { hesh_settings: settings } },
		keepalive,
	} );
}

/**
 * Saves the latest settings once the save before has finished, so that an
 * older request can't reach the server last and undo a newer one.
 */
export function save(): Promise< void > {
	clearTimeout( saveTimer );
	saveTimer = undefined;
	queue = queue.then( async () => {
		const { settings } = state;
		if ( settings === lastSent ) {
			return;
		}
		lastSent = settings;
		try {
			await request( settings );
			if ( state.settings === settings ) {
				setState( { status: 'saved' } );
			}
		} catch {
			lastSent = null;
			if ( state.settings === settings ) {
				setState( { status: 'error' } );
			}
		}
	} );
	return queue;
}

// Leaving the page, by saving the post for example, would drop a save that is
// still waiting: send it now, in a request that outlives the page.
window.addEventListener( 'pagehide', () => {
	if ( saveTimer === undefined && state.settings === lastSent ) {
		return;
	}
	clearTimeout( saveTimer );
	saveTimer = undefined;
	lastSent = state.settings;
	request( state.settings, true ).catch( () => {} );
} );
