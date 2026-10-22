/**
 * Editor settings, stored per user in the `hesh_settings` user meta.
 * includes/settings-schema.json is the schema PHP registers the meta with,
 * settings.test.ts keeps it in step with the types here.
 */

export const themeIds = [
	'wordpress',
	'default',
	'one-dark',
	'github-light',
	'github-dark',
	'dracula',
	'monokai',
	'material-dark',
	'nord',
	'solarized-light',
	'solarized-dark',
	'gruvbox-dark',
	'eclipse',
] as const;

export type ThemeId = ( typeof themeIds )[ number ];

export const keyMapIds = [ 'default', 'vscode', 'vim', 'emacs' ] as const;

export type KeyMapId = ( typeof keyMapIds )[ number ];

export interface Settings {
	theme: ThemeId;
	keyMap: KeyMapId;
	tabSize: number;
	fontSize: number;
	lineHeight: number;
	lineWrapping: boolean;
	lineNumbers: boolean;
	foldGutter: boolean;
	matchBrackets: boolean;
	highlightSelectionMatches: boolean;
	autoCloseTags: boolean;
	autoCloseBrackets: boolean;
}

export type BooleanSetting = {
	[ Key in keyof Settings ]: Settings[ Key ] extends boolean ? Key : never;
}[ keyof Settings ];

export const defaultSettings: Settings = {
	theme: 'wordpress',
	keyMap: 'default',
	tabSize: 4,
	fontSize: 13,
	lineHeight: 1.5,
	lineWrapping: true,
	lineNumbers: true,
	foldGutter: false,
	matchBrackets: false,
	highlightSelectionMatches: false,
	autoCloseTags: false,
	autoCloseBrackets: false,
};

export const ranges = {
	tabSize: { min: 1, max: 6, step: 1 },
	fontSize: { min: 8, max: 20, step: 1 },
	lineHeight: { min: 1, max: 2, step: 0.25 },
} as const;

/**
 * The values a numeric setting can take, smallest first.
 * @param key A numeric setting.
 */
export function rangeValues( key: keyof typeof ranges ): number[] {
	const { min, max, step } = ranges[ key ];
	const values: number[] = [];
	for ( let value = min; value <= max; value += step ) {
		values.push( value );
	}
	return values;
}

function isOneOf< T extends string >(
	values: readonly T[],
	value: unknown
): value is T {
	return (
		typeof value === 'string' &&
		( values as readonly string[] ).includes( value )
	);
}

function inRange( key: keyof typeof ranges, value: unknown ): value is number {
	const { min, max, step } = ranges[ key ];
	return (
		typeof value === 'number' &&
		value >= min &&
		value <= max &&
		Number.isInteger( ( value - min ) / step )
	);
}

/**
 * Valid settings from anything, using the default for each missing or invalid value.
 * @param value Settings as stored or submitted.
 */
export function normalizeSettings( value: unknown ): Settings {
	const input = (
		typeof value === 'object' && value !== null ? value : {}
	) as Record< string, unknown >;
	const settings: Settings = { ...defaultSettings };
	if ( isOneOf( themeIds, input.theme ) ) {
		settings.theme = input.theme;
	}
	if ( isOneOf( keyMapIds, input.keyMap ) ) {
		settings.keyMap = input.keyMap;
	}
	for ( const key of Object.keys( ranges ) as ( keyof typeof ranges )[] ) {
		const number = input[ key ];
		if ( inRange( key, number ) ) {
			settings[ key ] = number;
		}
	}
	for ( const key of Object.keys(
		defaultSettings
	) as ( keyof Settings )[] ) {
		if (
			typeof defaultSettings[ key ] === 'boolean' &&
			typeof input[ key ] === 'boolean'
		) {
			( settings as unknown as Record< string, boolean > )[ key ] = input[
				key
			] as boolean;
		}
	}
	return settings;
}
