import { __ } from '@wordpress/i18n';
import {
	Compartment,
	EditorState,
	countColumn,
	RangeSetBuilder,
	type Extension,
	type StateEffect,
} from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	drawSelection,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	type DecorationSet,
	type KeyBinding,
	type ViewUpdate,
} from '@codemirror/view';
import {
	bracketMatching,
	foldGutter,
	foldKeymap,
	indentUnit,
} from '@codemirror/language';
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentLess,
	insertNewlineKeepIndent,
	insertTab,
	redo,
} from '@codemirror/commands';
import {
	highlightSelectionMatches,
	search,
	searchKeymap,
} from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { wordpressPost } from '../lang-shortcode';
import type { Settings } from '../settings/settings';
import { themes } from './themes';
import { loadKeyMap } from './keymaps';

export interface EditorOptions {
	/** The editor is appended to this element. */
	parent: HTMLElement;
	doc: string;
	settings: Settings;
	/** Surface-specific extensions: change listeners, extra key bindings. */
	extensions?: Extension[];
	/**
	 * How far down the WordPress bars that stick over the area the editor
	 * scrolls in reach, from the top of that area. The search panel sticks
	 * below them, and the cursor is kept from scrolling under them or the panel.
	 */
	stickyTop?: () => number;
}

export interface Editor {
	view: EditorView;
	/** Reconfigures the editor, loading the theme and keymap first if needed. */
	applySettings: ( settings: Settings ) => Promise< void >;
	/** Empties the undo history. */
	clearHistory: () => void;
	destroy: () => void;
}

// one compartment per group of settings, so changing one setting reconfigures only that part
const compartments = {
	keyMap: new Compartment(),
	theme: new Compartment(),
	language: new Compartment(),
	lineNumbers: new Compartment(),
	foldGutter: new Compartment(),
	lineWrapping: new Compartment(),
	indentation: new Compartment(),
	font: new Compartment(),
	matchBrackets: new Compartment(),
	closeBrackets: new Compartment(),
	selectionMatches: new Compartment(),
};

type Part = keyof typeof compartments;

const noCloseBrackets: Extension = [];

interface Loaded {
	theme: Extension;
	keyMap: Extension;
}

// what each compartment holds for the given settings
function parts(
	settings: Settings,
	loaded: Loaded
): Record< Part, Extension > {
	return {
		keyMap: loaded.keyMap,
		theme: loaded.theme,
		language: wordpressPost( { autoCloseTags: settings.autoCloseTags } ),
		lineNumbers: settings.lineNumbers
			? [ lineNumbers(), highlightActiveLineGutter() ]
			: [],
		foldGutter: settings.foldGutter ? foldGutter() : [],
		lineWrapping: settings.lineWrapping
			? [ EditorView.lineWrapping, hangingIndent ]
			: [],
		indentation: [
			EditorState.tabSize.of( settings.tabSize ),
			// 2.x always indented with tabs
			indentUnit.of( '\t' ),
		],
		font: EditorView.theme( {
			'&': { fontSize: `${ settings.fontSize }px` },
			'.cm-scroller': { lineHeight: String( settings.lineHeight ) },
		} ),
		matchBrackets: settings.matchBrackets ? bracketMatching() : [],
		closeBrackets: settings.autoCloseBrackets
			? closeBrackets()
			: noCloseBrackets,
		selectionMatches: settings.highlightSelectionMatches
			? highlightSelectionMatches()
			: [],
	};
}

// which compartments depend on each setting
const partsForSetting: Record< keyof Settings, Part > = {
	theme: 'theme',
	keyMap: 'keyMap',
	autoCloseTags: 'language',
	lineNumbers: 'lineNumbers',
	foldGutter: 'foldGutter',
	lineWrapping: 'lineWrapping',
	tabSize: 'indentation',
	fontSize: 'font',
	lineHeight: 'font',
	matchBrackets: 'matchBrackets',
	autoCloseBrackets: 'closeBrackets',
	highlightSelectionMatches: 'selectionMatches',
};

function warn( message: string, error: unknown ): void {
	// eslint-disable-next-line no-console
	console.warn( `HTML Editor Syntax Highlighter: ${ message }`, error );
}

// A theme or keymap chunk that can't load (a blocked request, a cached page
// after an update) falls back to the bundled theme or the default keys, so the
// editor and its settings still open and another choice can be made there.
async function load( settings: Settings ): Promise< Loaded > {
	const [ theme, keyMap ] = await Promise.all( [
		themes[ settings.theme ].load().catch( ( error: unknown ) => {
			warn(
				`the ${ settings.theme } theme could not load, using WordPress`,
				error
			);
			return themes.wordpress.load();
		} ),
		loadKeyMap( settings.keyMap ).catch( ( error: unknown ) => {
			warn(
				`the ${ settings.keyMap } key bindings could not load, using the default ones`,
				error
			);
			return loadKeyMap( 'default' );
		} ),
	] );
	return { theme, keyMap };
}

// Backspace between an empty pair deletes both brackets, but only while Auto-close
// brackets is on: the command itself doesn't check. It keeps its place in the
// keymap, so the optional keymaps still come first.
const closeBracketsKeys: KeyBinding[] = closeBracketsKeymap.map(
	( binding ) => ( {
		...binding,
		run: ( view ) =>
			compartments.closeBrackets.get( view.state ) !== noCloseBrackets &&
			( binding.run?.( view ) ?? false ),
	} )
);

const isWindows =
	typeof navigator !== 'undefined' && /Win/.test( navigator.platform );

// Whether a binding takes a character typed with AltGr on Windows, which
// reports AltGr as Ctrl+Alt: Ctrl-Alt-[ (fold all) would take the [ of German
// and other keyboard layouts, Ctrl-Alt-\ (indent) their \.
function takesAltGrCharacter( key: string | undefined ): boolean {
	if ( ! key ) {
		return false;
	}
	const modifiers = key.split( /-(?!$)/ );
	const name = modifiers.pop()!;
	return (
		name.length === 1 &&
		! /[a-z0-9]/i.test( name ) &&
		modifiers.some( ( part ) => /^(c|ctrl|control|mod)$/i.test( part ) ) &&
		modifiers.some( ( part ) => /^(a|alt)$/i.test( part ) )
	);
}

/**
 * Leaves out, on Windows, the bindings that would take a character typed with
 * AltGr instead of letting it be typed.
 * @param bindings Key bindings.
 */
export function withoutAltGrKeys(
	bindings: readonly KeyBinding[]
): KeyBinding[] {
	return isWindows
		? bindings.filter(
				( binding ) =>
					! takesAltGrCharacter( binding.win ?? binding.key )
			)
		: [ ...bindings ];
}

const baseTheme = EditorView.baseTheme( {
	'.cm-scroller': {
		fontFamily:
			'Menlo, Consolas, Monaco, "Liberation Mono", "Lucida Console", monospace',
	},
	'.cm-gutters': { userSelect: 'none' },
	// below the bars that stickyTop() measures, see stickyBars()
	'& .cm-panels.cm-panels-top': { top: 'var(--hesh-sticky-top, 0px)' },
} );

// The history lives in a compartment, so it can be emptied by taking it out
// and putting it back.
const historyCompartment = new Compartment();

// Keeps the search panel and the cursor clear of bars stuck over the top of the
// scrolling area, which CodeMirror doesn't know about.
function stickyBars( stickyTop: () => number ): Extension {
	const measure = {
		key: stickyTop,
		read: stickyTop,
		write: ( top: number, view: EditorView ) =>
			view.dom.style.setProperty( '--hesh-sticky-top', `${ top }px` ),
	};
	return [
		EditorView.scrollMargins.of( ( view ) => {
			// the search panel sticks below the bars, over the code
			const panel =
				view.dom.querySelector< HTMLElement >( '.cm-panels-top' );
			const covered = stickyTop() + ( panel?.offsetHeight ?? 0 );
			const { scrollDOM } = view;
			if ( scrollDOM.scrollHeight <= scrollDOM.clientHeight ) {
				return { top: covered };
			}
			// CodeMirror scrolls the code itself (the Classic editor without full
			// height, where the bars are fixed to the window): only what they and
			// the panel cover of its scroller counts.
			const top = scrollDOM.getBoundingClientRect().top;
			return { top: Math.min( covered, Math.max( 0, covered - top ) ) };
		} ),
		ViewPlugin.define( ( view ) => {
			const remeasure = () => view.requestMeasure( measure );
			remeasure();
			// WordPress pins and unpins its bars as the page scrolls
			document.addEventListener( 'scroll', remeasure, {
				capture: true,
				passive: true,
			} );
			window.addEventListener( 'resize', remeasure );
			return {
				update( update: ViewUpdate ) {
					if ( update.geometryChanged ) {
						remeasure();
					}
				},
				destroy() {
					document.removeEventListener( 'scroll', remeasure, {
						capture: true,
					} );
					window.removeEventListener( 'resize', remeasure );
				},
			};
		} ),
	];
}

export async function createEditor(
	options: EditorOptions
): Promise< Editor > {
	let settings = options.settings;
	let loaded = await load( settings );
	const initialParts = parts( settings, loaded );

	const view = new EditorView( {
		parent: options.parent,
		state: EditorState.create( {
			doc: options.doc,
			extensions: [
				// optional keymaps take precedence over everything below
				compartments.keyMap.of( initialParts.keyMap ),
				historyCompartment.of( history() ),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of( true ),
				highlightActiveLine(),
				highlightSpecialChars(),
				search( { top: true } ),
				keymap.of(
					withoutAltGrKeys( [
						// keep the previous line's indentation, 2.x had smart indent switched off
						{ key: 'Enter', run: insertNewlineKeepIndent },
						{ key: 'Tab', run: insertTab, shift: indentLess },
						...closeBracketsKeys,
						...defaultKeymap,
						...searchKeymap,
						// historyKeymap redoes with Ctrl+Shift+Z on Linux and Mac only, 2.x did on Windows too
						{
							win: 'Ctrl-Shift-z',
							run: redo,
							preventDefault: true,
						},
						...historyKeymap,
						...foldKeymap,
					] )
				),
				// code reads left to right in right-to-left admin languages too
				EditorView.editorAttributes.of( { dir: 'ltr' } ),
				EditorView.contentAttributes.of( {
					'aria-label': __(
						'Code editor',
						'html-editor-syntax-highlighter'
					),
					spellcheck: 'false',
					autocorrect: 'off',
					autocapitalize: 'off',
				} ),
				baseTheme,
				...( Object.keys( compartments ) as Part[] )
					.filter( ( part ) => part !== 'keyMap' )
					.map( ( part ) =>
						compartments[ part ].of( initialParts[ part ] )
					),
				options.stickyTop ? stickyBars( options.stickyTop ) : [],
				...( options.extensions ?? [] ),
			],
		} ),
	} );

	let pending = 0;
	return {
		view,
		// never rejects, the settings store calls it without waiting
		async applySettings( next ) {
			const changed = (
				Object.keys( next ) as ( keyof Settings )[]
			 ).filter( ( key ) => next[ key ] !== settings[ key ] );
			if ( ! changed.length ) {
				return;
			}
			const request = ++pending;
			try {
				const nextLoaded =
					next.theme !== settings.theme ||
					next.keyMap !== settings.keyMap
						? await load( next )
						: loaded;
				// a newer call already applied its settings while this one was loading
				if ( request !== pending || view.dom.parentNode === null ) {
					return;
				}
				const nextParts = parts( next, nextLoaded );
				const effects: StateEffect< unknown >[] = [
					...new Set(
						changed.map( ( key ) => partsForSetting[ key ] )
					),
				].map( ( part ) =>
					compartments[ part ].reconfigure( nextParts[ part ] )
				);
				settings = next;
				loaded = nextLoaded;
				view.dispatch( { effects } );
			} catch ( error ) {
				warn( 'the settings could not be applied', error );
			}
		},
		clearHistory() {
			// a history field that is removed and added again starts empty
			view.dispatch( { effects: historyCompartment.reconfigure( [] ) } );
			view.dispatch( {
				effects: historyCompartment.reconfigure( history() ),
			} );
		},
		destroy() {
			pending++;
			view.destroy();
		},
	};
}

// Wrapped lines line up with the start of the line's text instead of the
// left edge, like the 2.x `indentWrappedLine`.
const hangingIndentCache = new Map< number, Decoration >();

function hangingIndentDecoration( columns: number ): Decoration {
	let decoration = hangingIndentCache.get( columns );
	if ( ! decoration ) {
		decoration = Decoration.line( {
			attributes: {
				style: `padding-left: calc(${ columns }ch + 6px); text-indent: -${ columns }ch`,
			},
		} );
		hangingIndentCache.set( columns, decoration );
	}
	return decoration;
}

function hangingIndentDecorations( view: EditorView ): DecorationSet {
	const builder = new RangeSetBuilder< Decoration >();
	const { doc, tabSize } = view.state;
	for ( const { from, to } of view.visibleRanges ) {
		for ( let pos = from; pos <= to; ) {
			const line = doc.lineAt( pos );
			const indent = /^[ \t]*/.exec( line.text )![ 0 ];
			if ( indent && indent.length < line.length ) {
				builder.add(
					line.from,
					line.from,
					hangingIndentDecoration( countColumn( indent, tabSize ) )
				);
			}
			pos = line.to + 1;
		}
	}
	return builder.finish();
}

const hangingIndent = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor( view: EditorView ) {
			this.decorations = hangingIndentDecorations( view );
		}
		update( update: ViewUpdate ) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.state.tabSize !== update.startState.tabSize
			) {
				this.decorations = hangingIndentDecorations( update.view );
			}
		}
	},
	{ decorations: ( plugin ) => plugin.decorations }
);
