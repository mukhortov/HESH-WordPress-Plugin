import {
	EditorSelection,
	Transaction,
	type ChangeSpec,
	type Text,
} from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { minimalChange } from '../editor/diff';

/**
 * Makes the hidden post textarea read and write CodeMirror's document and
 * selection, so everything in WordPress that works on the textarea keeps
 * working: Quicktags buttons, the link dialog, media inserts, the Visual tab,
 * autosave, word count.
 *
 * The real textarea value is kept in step on every change: forms are also
 * submitted in ways that fire no submit event (jQuery's .submit(), form.submit()),
 * and those must send the current content.
 */

const textareaProto = HTMLTextAreaElement.prototype;
const nativeValue = Object.getOwnPropertyDescriptor( textareaProto, 'value' )!;

const overridden = [
	'value',
	'selectionStart',
	'selectionEnd',
	'selectionDirection',
	'setSelectionRange',
	'setRangeText',
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

	// the document as a string, made once per change for sync() and the getter
	let cachedDoc: Text | null = null;
	let cachedValue = '';
	const docString = () => {
		if ( view.state.doc !== cachedDoc ) {
			cachedDoc = view.state.doc;
			cachedValue = cachedDoc.toString();
		}
		return cachedValue;
	};

	const sync = () => nativeValue.set!.call( textarea, docString() );

	// a textarea turns \r\n into \n, so does CodeMirror
	const normalize = ( text: unknown ) =>
		String( text ?? '' ).replace( /\r\n?/g, '\n' );

	// changes written to the textarea, like the ones typed into it
	const write = ( changes: ChangeSpec, selection?: EditorSelection ) =>
		view.dispatch( {
			changes,
			selection,
			annotations: [
				Transaction.addToHistory.of( options.addToHistory() ),
				Transaction.userEvent.of( 'input.textarea' ),
			],
		} );

	Object.defineProperties( textarea, {
		value: {
			configurable: true,
			get: docString,
			set( value: unknown ) {
				const current = docString();
				const next = normalize( value );
				if ( next !== current ) {
					write( minimalChange( current, next ) );
				}
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
		// the selection afterwards follows the HTML spec's selectMode
		setRangeText: {
			configurable: true,
			value(
				replacement: string,
				start?: number,
				end?: number,
				selectMode: SelectionMode = 'preserve'
			) {
				const selection = main();
				const from =
					start === undefined ? selection.from : clamp( start );
				const to =
					end === undefined
						? selection.to
						: Math.max( from, clamp( end ) );
				const insert = normalize( replacement );
				const insertEnd = from + insert.length;
				const delta = insert.length - ( to - from );
				let anchor: number;
				let head: number;
				if ( selectMode === 'select' ) {
					[ anchor, head ] = [ from, insertEnd ];
				} else if ( selectMode === 'start' ) {
					anchor = head = from;
				} else if ( selectMode === 'end' ) {
					anchor = head = insertEnd;
				} else {
					const keep = ( pos: number, inside: number ) => {
						if ( pos > to ) {
							return pos + delta;
						}
						return pos > from ? inside : pos;
					};
					anchor = keep( selection.from, from );
					head = keep( selection.to, insertEnd );
				}
				write(
					{ from, to, insert },
					EditorSelection.single( anchor, head )
				);
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
