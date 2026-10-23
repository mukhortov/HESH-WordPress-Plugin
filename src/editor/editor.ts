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
}

export interface Editor {
	view: EditorView;
	/** Reconfigures the editor, loading the theme and keymap first if needed. */
	applySettings: ( settings: Settings ) => Promise< void >;
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

const baseTheme = EditorView.baseTheme( {
	'.cm-scroller': {
		fontFamily:
			'Menlo, Consolas, Monaco, "Liberation Mono", "Lucida Console", monospace',
	},
	'.cm-gutters': { userSelect: 'none' },
} );

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
				history(),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of( true ),
				highlightActiveLine(),
				highlightSpecialChars(),
				search( { top: true } ),
				keymap.of( [
					// keep the previous line's indentation, 2.x had smart indent switched off
					{ key: 'Enter', run: insertNewlineKeepIndent },
					{ key: 'Tab', run: insertTab, shift: indentLess },
					...closeBracketsKeys,
					...defaultKeymap,
					...searchKeymap,
					...historyKeymap,
					...foldKeymap,
				] ),
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
