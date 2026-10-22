import { describe, expect, it } from 'vitest';
import { ChangeSet, Text } from '@codemirror/state';
import { minimalChange } from './diff';

function apply( from: string, to: string ): string {
	return ChangeSet.of( minimalChange( from, to ), from.length )
		.apply( Text.of( from.split( '\n' ) ) )
		.toString();
}

describe( 'minimalChange', () => {
	it( 'replaces only what changed', () => {
		expect( minimalChange( '<p>Hello</p>', '<p>Hi</p>' ) ).toEqual( {
			from: 4,
			to: 8,
			insert: 'i',
		} );
		expect( minimalChange( 'abc', 'abc' ) ).toEqual( {
			from: 3,
			to: 3,
			insert: '',
		} );
		expect( minimalChange( '', 'new' ) ).toEqual( {
			from: 0,
			to: 0,
			insert: 'new',
		} );
		expect( minimalChange( 'old', '' ) ).toEqual( {
			from: 0,
			to: 3,
			insert: '',
		} );
	} );

	it( 'handles repeated characters at the edges', () => {
		expect( apply( 'aaaa', 'aa' ) ).toBe( 'aa' );
		expect( apply( 'abab', 'ab' ) ).toBe( 'ab' );
		expect( apply( '[a][a]', '[a][b][a]' ) ).toBe( '[a][b][a]' );
	} );

	it( 'keeps surrogate pairs whole', () => {
		const change = minimalChange( 'x😀y', 'x😁y' ) as {
			from: number;
			to: number;
			insert: string;
		};
		expect( change ).toEqual( { from: 1, to: 3, insert: '😁' } );
		expect( apply( 'x😀y', 'x😁y' ) ).toBe( 'x😁y' );
	} );
} );
