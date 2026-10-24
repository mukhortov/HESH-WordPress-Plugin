import { ExternalTokenizer, type InputStream } from '@lezer/lr';
import {
	Text,
	EscapedShortcode,
	WordPressComment,
	TagName,
	InvalidTagName,
	AttributeName,
	InvalidAttribute,
	UnquotedValue,
	QuotedValue,
	InvalidValue,
} from './parser.terms';

const enum Ch {
	Tab = 9,
	Newline = 10,
	CarriageReturn = 13,
	Space = 32,
	Exclamation = 33,
	DoubleQuote = 34,
	SingleQuote = 39,
	Dash = 45,
	Slash = 47,
	LessThan = 60,
	Equals = 61,
	GreaterThan = 62,
	Question = 63,
	OpenBracket = 91,
	CloseBracket = 93,
	NoBreakSpace = 160,
}

// How far to look for the end of a shortcode before treating its `[` as plain text
const maxTagLength = 10000;

const isSpace = ( ch: number ) =>
	ch === Ch.Space ||
	ch === Ch.Tab ||
	ch === Ch.Newline ||
	ch === Ch.CarriageReturn ||
	ch === Ch.NoBreakSpace;

const isQuote = ( ch: number ) =>
	ch === Ch.DoubleQuote || ch === Ch.SingleQuote;

const isLetter = ( ch: number ) =>
	( ch >= 65 && ch <= 90 ) || ( ch >= 97 && ch <= 122 );

const lowerCase = ( ch: number ) => ( ch >= 65 && ch <= 90 ? ch + 32 : ch );

// a word is anything up to a space, quote, `=`, bracket or the `/]` that self-closes the tag
function isWordChar( input: InputStream, offset: number ): boolean {
	const ch = input.peek( offset );
	if ( ch < 0 || isSpace( ch ) || isQuote( ch ) ) {
		return false;
	}
	if ( ch === Ch.Equals || ch === Ch.OpenBracket || ch === Ch.CloseBracket ) {
		return false;
	}
	return ! (
		ch === Ch.Slash && input.peek( offset + 1 ) === Ch.CloseBracket
	);
}

// `text` is lower case, the input matches it in any case unless `exact`
function matches(
	input: InputStream,
	offset: number,
	text: string,
	exact = false
): boolean {
	for ( let i = 0; i < text.length; i++ ) {
		const ch = input.peek( offset + i );
		if ( ( exact ? ch : lowerCase( ch ) ) !== text.charCodeAt( i ) ) {
			return false;
		}
	}
	return true;
}

// offset just past the next `text`, or -1 if the document ends first
function indexAfter(
	input: InputStream,
	offset: number,
	text: string,
	exact = false
): number {
	for ( let i = offset; input.peek( i ) >= 0; i++ ) {
		if ( matches( input, i, text, exact ) ) {
			return i + text.length;
		}
	}
	return -1;
}

// offset just past the shortcode that starts at `offset`, or -1 if the `[` is plain text.
// Like the 2.5.0 CodeMirror 5 mode: quoted values may hold anything except their own
// quote, and an unquoted `[` or `<` means the bracket never was a shortcode.
function shortcodeEnd( input: InputStream, offset: number ): number {
	let i = offset + ( input.peek( offset + 1 ) === Ch.Slash ? 2 : 1 );
	if ( ! isWordChar( input, i ) || input.peek( i ) === Ch.LessThan ) {
		return -1;
	}
	const limit = offset + maxTagLength;
	while ( i < limit ) {
		const ch = input.peek( i );
		if ( ch < 0 || ch === Ch.OpenBracket || ch === Ch.LessThan ) {
			return -1;
		}
		if ( ch === Ch.CloseBracket ) {
			return i + 1;
		}
		if ( ch === Ch.Slash && input.peek( i + 1 ) === Ch.CloseBracket ) {
			return i + 2;
		}
		if ( isQuote( ch ) ) {
			let close = i + 1;
			while ( input.peek( close ) !== ch ) {
				if ( input.peek( close ) < 0 || close >= limit ) {
					return -1;
				}
				close++;
			}
			i = close + 1;
		} else {
			i++;
		}
	}
	return -1;
}

// `[[name]]` prints `[name]` instead of running the shortcode
function escapedShortcodeEnd( input: InputStream, offset: number ): number {
	if (
		input.peek( offset + 1 ) !== Ch.OpenBracket ||
		input.peek( offset + 2 ) === Ch.OpenBracket ||
		isSpace( input.peek( offset + 2 ) )
	) {
		return -1;
	}
	const limit = offset + maxTagLength;
	for ( let i = offset + 2; i < limit && input.peek( i ) >= 0; i++ ) {
		if (
			input.peek( i ) === Ch.CloseBracket &&
			input.peek( i + 1 ) === Ch.CloseBracket
		) {
			return i + 2;
		}
	}
	return -1;
}

// `<!--more-->`, `<!--more Read on-->`, `<!--noteaser-->` and `<!--nextpage-->`
function wordPressCommentEnd( input: InputStream, offset: number ): number {
	if ( matches( input, offset, '<!--noteaser-->' ) ) {
		return offset + 15;
	}
	if ( matches( input, offset, '<!--nextpage-->' ) ) {
		return offset + 15;
	}
	if ( ! matches( input, offset, '<!--more' ) ) {
		return -1;
	}
	const end = indexAfter( input, offset + 8, '-->' );
	return end < 0 ? -1 : end;
}

// Skip an HTML construct that starts with `<` at `offset`, so that brackets
// inside tags, comments, `<?php ?>` blocks and script or style elements
// are left to the HTML parser. Returns the offset after it.
function skipHtml( input: InputStream, offset: number ): number {
	const next = input.peek( offset + 1 );
	const end = ( found: number ) =>
		found < 0 ? endOfInput( input, offset ) : found;

	if ( next === Ch.Exclamation ) {
		if ( matches( input, offset, '<!--' ) ) {
			return end( indexAfter( input, offset + 4, '-->' ) );
		}
		if ( matches( input, offset, '<![cdata[' ) ) {
			return end( indexAfter( input, offset + 9, ']]>' ) );
		}
		return end( indexAfter( input, offset + 2, '>' ) );
	}
	if ( next === Ch.Question ) {
		return end( indexAfter( input, offset + 2, '?>' ) );
	}
	if ( next === Ch.Slash ) {
		if ( ! isLetter( input.peek( offset + 2 ) ) ) {
			return offset + 1;
		}
		return end( indexAfter( input, offset + 2, '>' ) );
	}
	if ( ! isLetter( next ) ) {
		return offset + 1;
	}

	let i = offset + 1;
	let name = '';
	while (
		isLetter( input.peek( i ) ) ||
		( input.peek( i ) >= 48 && input.peek( i ) <= 57 )
	) {
		name += String.fromCharCode( lowerCase( input.peek( i ) ) );
		i++;
	}
	// attributes, where a quoted value may contain `>`
	for (;;) {
		const ch = input.peek( i );
		if ( ch < 0 ) {
			return i;
		}
		if ( ch === Ch.GreaterThan ) {
			i++;
			break;
		}
		if ( isQuote( ch ) ) {
			let close = i + 1;
			while ( input.peek( close ) >= 0 && input.peek( close ) !== ch ) {
				close++;
			}
			if ( input.peek( close ) < 0 ) {
				return close;
			}
			i = close + 1;
		} else {
			i++;
		}
	}
	// raw text ends exactly where @lezer/html ends it, at a lower case `</script>`
	if ( name === 'script' || name === 'style' ) {
		return end( indexAfter( input, i, `</${ name }>`, true ) );
	}
	return i;
}

function endOfInput( input: InputStream, offset: number ): number {
	let i = offset;
	while ( input.peek( i ) >= 0 ) {
		i++;
	}
	return i;
}

/**
 * Text up to the next shortcode, in chunks of at most a line (or one HTML
 * construct) so edits only re-scan a little of the document.
 */
export const content = new ExternalTokenizer( ( input, stack ) => {
	if ( ! stack.canShift( Text ) ) {
		return;
	}

	if ( input.next === Ch.OpenBracket ) {
		const escaped = escapedShortcodeEnd( input, 0 );
		if ( escaped > 0 ) {
			return input.acceptToken( EscapedShortcode, escaped );
		}
		if ( shortcodeEnd( input, 0 ) > 0 ) {
			return;
		} // parsed by the grammar
	} else if ( input.next === Ch.LessThan ) {
		const comment = wordPressCommentEnd( input, 0 );
		if ( comment > 0 ) {
			return input.acceptToken( WordPressComment, comment );
		}
	}

	let i = 0;
	for (;;) {
		const ch = input.peek( i );
		if ( ch < 0 ) {
			break;
		}
		if ( ch === Ch.OpenBracket && i > 0 ) {
			if (
				escapedShortcodeEnd( input, i ) > 0 ||
				shortcodeEnd( input, i ) > 0
			) {
				break;
			}
			i++;
		} else if ( ch === Ch.LessThan ) {
			if ( i > 0 && wordPressCommentEnd( input, i ) > 0 ) {
				break;
			}
			i = skipHtml( input, i );
		} else {
			i++;
			if ( ch === Ch.Newline ) {
				break;
			}
		}
	}
	if ( i > 0 ) {
		input.acceptToken( Text, i );
	}
} );

const validTagName = /^[^<>&/\[\]\x00-\x20\x7f=]+$/;
const validAttributeName = /^[\w-]+$/;

/** Names and values inside a shortcode tag. */
export const tagWords = new ExternalTokenizer(
	( input, stack ) => {
		const ch = input.next;
		if ( isQuote( ch ) ) {
			if ( ! stack.canShift( QuotedValue ) ) {
				return;
			}
			let i = 1;
			let hasBracket = false;
			for ( ; input.peek( i ) !== ch; i++ ) {
				const inner = input.peek( i );
				if ( inner < 0 ) {
					return;
				}
				if ( inner === Ch.OpenBracket || inner === Ch.CloseBracket ) {
					hasBracket = true;
				}
			}
			// WordPress ends the shortcode at the first `]`, even inside quotes
			return input.acceptToken(
				hasBracket ? InvalidValue : QuotedValue,
				i + 1
			);
		}

		let word = '';
		while ( isWordChar( input, word.length ) ) {
			word += String.fromCharCode( input.peek( word.length ) );
		}
		if ( ! word ) {
			return;
		}

		if ( stack.canShift( TagName ) ) {
			input.acceptToken(
				validTagName.test( word ) ? TagName : InvalidTagName,
				word.length
			);
		} else if ( stack.canShift( UnquotedValue ) ) {
			input.acceptToken( UnquotedValue, word.length );
		} else if ( stack.canShift( AttributeName ) ) {
			input.acceptToken(
				validAttributeName.test( word )
					? AttributeName
					: InvalidAttribute,
				word.length
			);
		}
	},
	{ contextual: true }
);
