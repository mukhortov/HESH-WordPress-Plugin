import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TreeFragment, IterMode, type Tree } from '@lezer/common';
import { highlightTree, classHighlighter } from '@lezer/highlight';
import { shortcodeLanguage, unmatchedCloseTags, wordpressPost } from './index';

// the "Sample Text for testing" block in README.md
const readme = readFileSync(
	new URL( '../../README.md', import.meta.url ),
	'utf8'
);
const sample = /## Sample Text for testing[\s\S]*?```HTML\n([\s\S]*?)```/.exec(
	readme
)![ 1 ];

const shortcodeParser = shortcodeLanguage.parser;
const mixedParser = wordpressPost().language.parser;

// The top-level shortcode nodes, as `Name text` lines.
function shortcodeNodes( text: string ): string[] {
	const nodes: string[] = [];
	const cursor = shortcodeParser.parse( text ).cursor();
	if ( cursor.firstChild() ) {
		do {
			if ( cursor.name !== 'Text' ) {
				nodes.push(
					`${ cursor.name } ${ text.slice( cursor.from, cursor.to ) }`
				);
			}
		} while ( cursor.nextSibling() );
	}
	return nodes;
}

// Highlight classes for each highlighted token, as `class: text` lines.
function highlights( text: string ): string[] {
	const tokens: string[] = [];
	highlightTree(
		mixedParser.parse( text ),
		classHighlighter,
		( from, to, classes ) =>
			tokens.push( `${ classes }: ${ text.slice( from, to ) }` )
	);
	return tokens;
}

// Names of the nodes around the nth `search` in `text`, innermost first.
function nodePath(
	tree: Tree,
	text: string,
	search: string,
	nth = 0
): string[] {
	let pos = -1;
	for ( let i = 0; i <= nth; i++ ) {
		pos = text.indexOf( search, pos + 1 );
	}
	if ( pos < 0 ) {
		throw new Error( `"${ search }" not found` );
	}
	const path: string[] = [];
	for (
		let node: ReturnType< Tree[ 'resolveInner' ] > | null =
			tree.resolveInner( pos, 1 );
		node;
		node = node.parent
	) {
		path.push( node.name );
	}
	return path;
}

function unmatched( text: string ): string[] {
	return unmatchedCloseTags( shortcodeParser.parse( text ), ( from, to ) =>
		text.slice( from, to )
	).map( ( { from, to } ) => text.slice( from, to ) );
}

describe( 'shortcode parser on the README sample', () => {
	it( 'finds the shortcodes, escapes and More tags', () => {
		expect( shortcodeNodes( sample ) ).toEqual( [
			'OpenTag [shortcode attribute="value" standAloneAttribute bool=true int=42 ]',
			'OpenTag [oneliner noquotes=stringvaluewithnospaces]',
			`SelfClosingTag [self-closing-syntax html='<label class="name">Label</label>' /]`,
			'EscapedShortcode [[escapedshortcode]]',
			'OpenTag [brackets that-dont-count]',
			'CloseTag [/shortcode]',
			'WordPressComment <!--more WordPress More Tag Text -->',
			'WordPressComment <!--noteaser-->',
			'WordPressComment <!--nextpage-->',
			'CloseTag [/matchlessEndTag]',
			`OpenTag [shortcode no_square_brackets='aa[<div here="whatever" adn=" ></div>]aaa']`,
			'SelfClosingTag [no/special|characters\\in*shortcode^names or.attribute`names=error /]',
		] );
	} );

	it( 'highlights shortcode names, attributes and values', () => {
		const tokens = highlights( sample );
		expect( tokens ).toEqual(
			expect.arrayContaining( [
				'tok-typeName: shortcode',
				'tok-propertyName: attribute',
				'tok-string: "value"',
				'tok-propertyName: standAloneAttribute',
				'tok-string: true',
				'tok-string: 42',
				'tok-punctuation: /]',
				'tok-punctuation: [/',
			] )
		);
	} );

	it( 'keeps HTML inside a quoted attribute as one value', () => {
		const tokens = highlights( sample );
		expect( tokens ).toContain(
			`tok-string: '<label class="name">Label</label>'`
		);
		expect( tokens ).not.toContain( 'tok-typeName: label' );
	} );

	it( 'marks invalid names and values', () => {
		expect( highlights( sample ) ).toEqual(
			expect.arrayContaining( [
				`tok-invalid: 'aa[<div here="whatever" adn=" ></div>]aaa'`,
				'tok-invalid: no/special|characters\\in*shortcode^names',
				'tok-invalid: or.attribute`names',
			] )
		);
	} );

	it( 'flags the closing tag without an opening tag', () => {
		expect( unmatched( sample ) ).toEqual( [ '[/matchlessEndTag]' ] );
	} );

	it( 'leaves square brackets in CSS and JavaScript alone', () => {
		const tree = mixedParser.parse( sample );
		expect( nodePath( tree, sample, '[attribute="value"]' ) ).toContain(
			'StyleSheet'
		);
		expect( nodePath( tree, sample, "['valueone'" ) ).toContain( 'Script' );
	} );

	it( 'leaves comments and PHP blocks to the HTML parser', () => {
		const tree = mixedParser.parse( sample );
		expect( nodePath( tree, sample, '[shortcode]-->' ) ).toContain(
			'Comment'
		);
		expect( nodePath( tree, sample, '[shortcode] \n\t<div' ) ).toContain(
			'ProcessingInst'
		);
	} );

	it( 'highlights More tags as meta and escaped shortcodes as comments', () => {
		expect( highlights( sample ) ).toEqual(
			expect.arrayContaining( [
				'tok-meta: <!--more WordPress More Tag Text -->',
				'tok-meta: <!--nextpage-->',
				'tok-comment: [[escapedshortcode]]',
				'tok-comment: <!--HTML comment-->',
			] )
		);
	} );
} );

describe( 'shortcode parser edge cases', () => {
	it( 'treats brackets that cannot start a shortcode as text', () => {
		expect(
			shortcodeNodes( '[ spaced] [] [/ x] [unclosed and text' )
		).toEqual( [] );
		expect( shortcodeNodes( '[note <strong>bold</strong>]' ) ).toEqual(
			[]
		);
		expect( shortcodeNodes( 'a [b="never closed]' ) ).toEqual( [] );
	} );

	it( 'does not look for shortcodes inside HTML tags', () => {
		expect(
			shortcodeNodes( '<a href="[url]" title=\'x > [y]\'>[link]</a>' )
		).toEqual( [ 'OpenTag [link]' ] );
	} );

	it( 'lets an HTML element span a shortcode', () => {
		const text = '<div class="a">[gallery ids="1,2"]</div>';
		const tree = mixedParser.parse( text );
		const close = nodePath( tree, text, '</div>' );
		expect( close.slice( 0, 4 ) ).toEqual( [
			'StartCloseTag',
			'CloseTag',
			'Element',
			'Document',
		] );
		expect( highlights( text ) ).not.toContain( 'tok-invalid: </div>' );
	} );

	it( 'parses multi-line shortcodes and positional values', () => {
		expect(
			shortcodeNodes( '[video\n\twidth="640"\n\tsrc=\'a.mp4\'\n]' )
		).toEqual( [ 'OpenTag [video\n\twidth="640"\n\tsrc=\'a.mp4\'\n]' ] );
		expect( highlights( '[foo "positional" bar]' ) ).toEqual( [
			'tok-punctuation: [',
			'tok-typeName: foo',
			'tok-string: "positional"',
			'tok-propertyName: bar',
			'tok-punctuation: ]',
		] );
	} );

	it( 'keeps a slash inside unquoted values', () => {
		expect( highlights( '[embed url=https://example.com/a/]' ) ).toContain(
			'tok-string: https://example.com/a'
		);
	} );

	it( 'matches closing tags like the 2.5.0 mode', () => {
		expect( unmatched( '[a][b][/a][/b]' ) ).toEqual( [ '[/b]' ] );
		expect( unmatched( '[a][b][/b][/a]' ) ).toEqual( [] );
		expect( unmatched( '[/a][a]' ) ).toEqual( [ '[/a]' ] );
		expect( unmatched( '[a/][/a]' ) ).toEqual( [ '[/a]' ] );
	} );

	it( 'handles empty and plain documents', () => {
		expect( shortcodeNodes( '' ) ).toEqual( [] );
		expect( highlights( '<p>Hello</p>' ) ).toEqual( [
			'tok-punctuation: <',
			'tok-typeName: p',
			'tok-punctuation: >',
			'tok-punctuation: </',
			'tok-typeName: p',
			'tok-punctuation: >',
		] );
	} );
} );

describe( 'incremental parsing', () => {
	// Reusing the old tree after an edit must give the same tree as parsing from scratch,
	// which only holds if the tokenizers report how far ahead they looked.
	it( 'matches a full parse after edits anywhere in the sample', () => {
		const tree = shortcodeParser.parse( sample );
		const mismatches: string[] = [];
		const inserts = [
			'[',
			']',
			'"',
			"'",
			'<',
			'>',
			'<!--',
			'-->',
			'<script>',
			'\n',
			'[[',
		];
		for ( let pos = 0; pos <= sample.length; pos += 5 ) {
			for ( const insert of inserts ) {
				const text =
					sample.slice( 0, pos ) + insert + sample.slice( pos );
				const fragments = TreeFragment.applyChanges(
					TreeFragment.addTree( tree ),
					[
						{
							fromA: pos,
							toA: pos,
							fromB: pos,
							toB: pos + insert.length,
						},
					]
				);
				const incremental = shortcodeParser.parse( text, fragments );
				const full = shortcodeParser.parse( text );
				if ( incremental.toString() !== full.toString() ) {
					mismatches.push(
						`${ JSON.stringify( insert ) } at ${ pos }`
					);
				}
			}
		}
		expect( mismatches ).toEqual( [] );
	} );

	it( 'does not enter the HTML overlay when scanning shortcodes', () => {
		const tree = mixedParser.parse( sample );
		const names = new Set< string >();
		// eslint-disable-next-line no-bitwise -- IterMode is a set of flags
		tree.cursor( IterMode.IgnoreMounts | IterMode.IgnoreOverlays ).iterate(
			( node ) => {
				names.add( node.name );
			}
		);
		expect( names.has( 'Element' ) ).toBe( false );
	} );
} );
