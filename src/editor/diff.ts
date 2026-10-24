import type { ChangeSpec } from '@codemirror/state';

const isLowSurrogate = ( code: number ) => code >= 0xdc00 && code <= 0xdfff;

/**
 * The smallest single change that turns `from` into `to`, so that applying
 * text replaced outside the editor keeps the cursor, folds and history of the
 * parts that did not change.
 * @param from The current text.
 * @param to   The new text.
 */
export function minimalChange( from: string, to: string ): ChangeSpec {
	const max = Math.min( from.length, to.length );
	let start = 0;
	while (
		start < max &&
		from.charCodeAt( start ) === to.charCodeAt( start )
	) {
		start++;
	}
	let endFrom = from.length;
	let endTo = to.length;
	while (
		endFrom > start &&
		endTo > start &&
		from.charCodeAt( endFrom - 1 ) === to.charCodeAt( endTo - 1 )
	) {
		endFrom--;
		endTo--;
	}
	// don't split a surrogate pair
	if ( start > 0 && isLowSurrogate( from.charCodeAt( start ) ) ) {
		start--;
	}
	if (
		endFrom < from.length &&
		isLowSurrogate( from.charCodeAt( endFrom ) )
	) {
		endFrom++;
		endTo++;
	}
	return { from: start, to: endFrom, insert: to.slice( start, endTo ) };
}
