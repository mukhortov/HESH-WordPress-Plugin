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

async function save(): Promise< void > {
	const { settings } = state;
	try {
		await apiFetch( {
			path: '/wp/v2/users/me',
			method: 'POST',
			data: { meta: { hesh_settings: settings } },
		} );
		if ( state.settings === settings ) {
			setState( { status: 'saved' } );
		}
	} catch {
		if ( state.settings === settings ) {
			setState( { status: 'error' } );
		}
	}
}
