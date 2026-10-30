import { describe, expect, it } from 'vitest';
import schema from '../../includes/settings-schema.json';
import { themes } from '../editor/themes';
import {
	defaultSettings,
	keyMapIds,
	normalizeSettings,
	rangeValues,
	ranges,
	themeIds,
} from './settings';

describe( 'settings schema', () => {
	// PHP registers the user meta with the JSON schema, the editor uses the TypeScript types
	it( 'matches the TypeScript settings', () => {
		const { properties } = schema;
		expect( Object.keys( properties ).sort() ).toEqual(
			Object.keys( defaultSettings ).sort()
		);
		expect( properties.theme.enum ).toEqual( [ ...themeIds ] );
		expect( properties.keyMap.enum ).toEqual( [ ...keyMapIds ] );
		for ( const [ key, value ] of Object.entries( defaultSettings ) ) {
			expect( properties[ key as keyof typeof properties ].default ).toBe(
				value
			);
		}
		for ( const key of Object.keys(
			ranges
		) as ( keyof typeof ranges )[] ) {
			expect( properties[ key ].minimum ).toBe( ranges[ key ].min );
			expect( properties[ key ].maximum ).toBe( ranges[ key ].max );
		}
		expect( schema.properties.lineHeight.multipleOf ).toBe(
			ranges.lineHeight.step
		);
	} );

	it( 'has a theme for every theme setting', () => {
		expect( Object.keys( themes ).sort() ).toEqual(
			[ ...themeIds ].sort()
		);
	} );
} );

describe( 'normalizeSettings', () => {
	it( 'fills in defaults', () => {
		expect( normalizeSettings( undefined ) ).toEqual( defaultSettings );
		expect( normalizeSettings( { theme: 'nord' } ) ).toEqual( {
			...defaultSettings,
			theme: 'nord',
		} );
	} );

	it( 'drops invalid and unknown values', () => {
		expect(
			normalizeSettings( {
				theme: 'cobalt',
				keyMap: 'sublime',
				tabSize: 12,
				fontSize: '14',
				lineHeight: 1.3,
				lineNumbers: 'false',
				scrollbarStyle: true,
			} )
		).toEqual( defaultSettings );
	} );

	it( 'keeps valid values', () => {
		const settings = {
			...defaultSettings,
			theme: 'dracula',
			keyMap: 'vim',
			tabSize: 2,
			fontSize: 16,
			lineHeight: 1.75,
			lineWrapping: false,
			foldGutter: true,
		} as const;
		expect( normalizeSettings( settings ) ).toEqual( settings );
	} );

	it( 'lists the values of numeric settings', () => {
		expect( rangeValues( 'lineHeight' ) ).toEqual( [
			1, 1.25, 1.5, 1.75, 2,
		] );
		expect( rangeValues( 'tabSize' ) ).toEqual( [ 1, 2, 3, 4, 5, 6 ] );
	} );
} );
