import { EditorSelection, Transaction } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { minimalChange } from '../editor/diff';

/**
 * Makes the hidden post textarea read and write CodeMirror's document and
 * selection, so everything in WordPress that works on the textarea keeps
 * working: Quicktags buttons, the link dialog, media inserts, the Visual tab,
 * autosave, word count.
 *
 * The real textarea value is kept in step for form submission.
 */

const textareaProto = HTMLTextAreaElement.prototype;
const nativeValue = Object.getOwnPropertyDescriptor( textareaProto, 'value' )!;

const overridden = [
	'value',
	'selectionStart',
	'selectionEnd',
	'selectionDirection',
	'setSelectionRange',
	'select',
	'focus',
	'scrollHeight',
] as const;

export interface FacadeOptions {
	/** Whether a change written to the textarea now should be undoable in CodeMirror. */
	addToHistory: () => boolean;
}

export interface Facade {
	/** Copies CodeMirror's document to the real textarea value. */
	sync: () => void;
	detach: () => void;
}

export function attachTextareaFacade(
	textarea: HTMLTextAreaElement,
	view: EditorView,
	options: FacadeOptions
): Facade {
	const clamp = ( pos: unknown ) =>
		Math.min(
			Math.max( Math.trunc( Number( pos ) ) || 0, 0 ),
			view.state.doc.length
		);

	const setSelection = ( anchor: number, head: number ) =>
		view.dispatch( {
			selection: EditorSelection.single( clamp( anchor ), clamp( head ) ),
		} );

	const main = () => view.state.selection.main;

	const sync = () =>
		nativeValue.set!.call( textarea, view.state.doc.toString() );

	Object.defineProperties( textarea, {
		value: {
			configurable: true,
			get: () => view.state.doc.toString(),
			set( value: unknown ) {
				const current = view.state.doc.toString();
				// a textarea turns \r\n into \n, so does CodeMirror
				const next = String( value ?? '' ).replace( /\r\n?/g, '\n' );
				if ( next === current ) {
					return;
				}
				view.dispatch( {
					changes: minimalChange( current, next ),
					annotations: [
						Transaction.addToHistory.of( options.addToHistory() ),
						Transaction.userEvent.of( 'input.textarea' ),
					],
				} );
			},
		},
		selectionStart: {
			configurable: true,
			get: () => main().from,
			set: ( start: number ) =>
				setSelection(
					clamp( start ),
					Math.max( clamp( start ), main().to )
				),
		},
		selectionEnd: {
			configurable: true,
			get: () => main().to,
			set: ( end: number ) =>
				setSelection(
					Math.min( main().from, clamp( end ) ),
					clamp( end )
				),
		},
		selectionDirection: {
			configurable: true,
			get: () => ( main().head < main().anchor ? 'backward' : 'forward' ),
			set: () => {},
		},
		setSelectionRange: {
			configurable: true,
			value( start: number, end: number, direction?: string ) {
				const from = clamp( start );
				const to = Math.max( from, clamp( end ) );
				if ( direction === 'backward' ) {
					setSelection( to, from );
				} else {
					setSelection( from, to );
				}
			},
		},
		select: {
			configurable: true,
			value: () => setSelection( 0, view.state.doc.length ),
		},
		focus: {
			configurable: true,
			value: () => view.focus(),
		},
		// editor-expand.js sizes the textarea by its scrollHeight in full-height mode
		scrollHeight: {
			configurable: true,
			get: () => Math.ceil( view.contentHeight ) + 2,
		},
	} );

	sync();

	return {
		sync,
		detach() {
			for ( const key of overridden ) {
				delete ( textarea as unknown as Record< string, unknown > )[
					key
				];
			}
			sync();
		},
	};
}
