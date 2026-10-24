import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { KeyMapId } from '../settings/settings';

/**
 * Optional key bindings, loaded on demand. They go in front of the default
 * keymap, which stays active underneath for anything they don't bind.
 * `vscode` replaces the Sublime Text bindings of 2.x.
 * @param id The key bindings setting.
 */
export function loadKeyMap( id: KeyMapId ): Promise< Extension > {
	switch ( id ) {
		case 'vim':
			return import(
				/* webpackChunkName: "keymap-vim" */ '@replit/codemirror-vim'
			).then( ( m ) => m.vim() );
		case 'emacs':
			return import(
				/* webpackChunkName: "keymap-emacs" */ '@replit/codemirror-emacs'
			).then( ( m ) => m.emacs() );
		case 'vscode':
			return import(
				/* webpackChunkName: "keymap-vscode" */ '@replit/codemirror-vscode-keymap'
			).then( ( m ) => keymap.of( m.vscodeKeymap ) );
		default:
			return Promise.resolve( [] );
	}
}
