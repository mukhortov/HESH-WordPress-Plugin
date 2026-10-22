import { parseMixed, IterMode, type Tree } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import { LRLanguage, LanguageSupport, syntaxTree } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type DecorationSet,
	type ViewUpdate,
} from '@codemirror/view';
import { parser } from './parser';

/** Shortcodes and More tags, with everything else left as `Text`. */
export const shortcodeLanguage = LRLanguage.define( {
	name: 'shortcode',
	parser: parser.configure( {
		props: [
			styleTags( {
				'StartTag StartCloseTag EndTag SelfCloseEndTag': t.angleBracket,
				TagName: t.tagName,
				AttributeName: t.attributeName,
				'QuotedValue UnquotedValue': t.attributeValue,
				Is: t.definitionOperator,
				'InvalidTagName InvalidAttribute InvalidValue': t.invalid,
				EscapedShortcode: t.comment,
				WordPressComment: t.meta,
			} ),
		],
	} ),
	languageData: {
		commentTokens: { block: { open: '<!--', close: '-->' } },
	},
} );

export interface WordPressPostConfig {
	/** Insert the closing HTML tag when `>` or `/` is typed (default true). */
	autoCloseTags?: boolean;
}

/**
 * Post content: HTML with inline CSS and JavaScript, plus shortcodes.
 * The HTML parser sees all the text between shortcodes as one document,
 * so an element can start before a shortcode and end after it.
 * @param config Language options.
 */
export function wordpressPost(
	config: WordPressPostConfig = {}
): LanguageSupport {
	const htmlSupport = html( { autoCloseTags: config.autoCloseTags ?? true } );
	return new LanguageSupport(
		shortcodeLanguage.configure( {
			wrap: parseMixed( ( node ) =>
				node.type.isTop
					? {
							parser: htmlSupport.language.parser,
							overlay: ( child ) => child.name === 'Text',
						}
					: null
			),
		} ),
		[ htmlSupport.support, unmatchedCloseTagHighlighter ]
	);
}

export interface Range {
	from: number;
	to: number;
}

/**
 * Closing shortcodes with no opening tag before them, like the 2.5.0 mode
 * flagged. Opening tags are never errors, a shortcode may stand alone.
 *
 * @param tree A tree from the shortcode parser.
 * @param read Reads the document text between two positions.
 */
export function unmatchedCloseTags(
	tree: Tree,
	read: ( from: number, to: number ) => string
): Range[] {
	const open: string[] = [];
	const unmatched: Range[] = [];
	const cursor = tree.cursor(
		// eslint-disable-next-line no-bitwise -- IterMode is a set of flags
		IterMode.IgnoreMounts | IterMode.IgnoreOverlays
	);
	if ( ! cursor.firstChild() ) {
		return unmatched;
	}
	do {
		if ( cursor.name !== 'OpenTag' && cursor.name !== 'CloseTag' ) {
			continue;
		}
		const tagName = cursor.node.getChild( 'TagName' );
		if ( ! tagName ) {
			continue;
		}
		const name = read( tagName.from, tagName.to );
		if ( cursor.name === 'OpenTag' ) {
			open.push( name );
			continue;
		}
		// a closing tag also closes the standalone shortcodes opened after its opening tag
		const index = open.lastIndexOf( name );
		if ( index < 0 ) {
			unmatched.push( { from: cursor.from, to: cursor.to } );
		} else {
			open.length = index;
		}
	} while ( cursor.nextSibling() );
	return unmatched;
}

const unmatchedMark = Decoration.mark( { class: 'cm-hesh-unmatchedTag' } );

function unmatchedDecorations( state: EditorState ): DecorationSet {
	const builder = new RangeSetBuilder< Decoration >();
	const tree = syntaxTree( state );
	for ( const { from, to } of unmatchedCloseTags( tree, ( a, b ) =>
		state.doc.sliceString( a, b )
	) ) {
		builder.add( from, to, unmatchedMark );
	}
	return builder.finish();
}

const unmatchedCloseTagHighlighter = [
	ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor( view: EditorView ) {
				this.decorations = unmatchedDecorations( view.state );
			}
			update( update: ViewUpdate ) {
				if (
					syntaxTree( update.state ) !==
					syntaxTree( update.startState )
				) {
					this.decorations = unmatchedDecorations( update.state );
				}
			}
		},
		{ decorations: ( plugin ) => plugin.decorations }
	),
	EditorView.baseTheme( {
		'.cm-hesh-unmatchedTag': {
			textDecoration: 'underline wavy #e65054',
			textUnderlineOffset: '3px',
		},
	} ),
];
