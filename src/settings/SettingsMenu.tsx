// WordPress 6.5 has no `react-jsx-runtime` script, so JSX compiles to
// createElement() from @wordpress/element (tsconfig.json matches this).
/* @jsxRuntime classic */
/* @jsx createElement */
/* @jsxFrag Fragment */
import type { ReactNode } from 'react';
import {
	createElement,
	createInterpolateElement,
	createRoot,
	useSyncExternalStore,
} from '@wordpress/element';
import {
	Button,
	Dropdown,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { themes } from '../editor/themes';
import { getState, subscribe, updateSettings } from './store';
import {
	keyMapIds,
	rangeValues,
	themeIds,
	type BooleanSetting,
	type KeyMapId,
	type ThemeId,
} from './settings';

const keyMapLabels = (): Record< KeyMapId, string > => ( {
	default: __( 'Default', 'html-editor-syntax-highlighter' ),
	vscode: 'VS Code',
	vim: 'Vim',
	emacs: 'Emacs',
} );

const themeLabel = ( id: ThemeId ) =>
	id === 'default'
		? __( 'Default (light)', 'html-editor-syntax-highlighter' )
		: themes[ id ].label;

const toggles = (): [ BooleanSetting, string ][] => [
	[
		'lineWrapping',
		__( 'Wrap long lines', 'html-editor-syntax-highlighter' ),
	],
	[ 'lineNumbers', __( 'Line numbers', 'html-editor-syntax-highlighter' ) ],
	[ 'foldGutter', __( 'Code folding', 'html-editor-syntax-highlighter' ) ],
	[
		'matchBrackets',
		__(
			'Highlight matching brackets and tags',
			'html-editor-syntax-highlighter'
		),
	],
	[
		'highlightSelectionMatches',
		__(
			'Highlight other copies of the selection',
			'html-editor-syntax-highlighter'
		),
	],
	[
		'autoCloseTags',
		__( 'Auto-close HTML tags', 'html-editor-syntax-highlighter' ),
	],
	[
		'autoCloseBrackets',
		__(
			'Auto-close brackets and quotes',
			'html-editor-syntax-highlighter'
		),
	],
];

const numberOptions = (
	values: number[],
	format: ( value: number ) => string
) =>
	values.map( ( value ) => ( {
		value: String( value ),
		label: format( value ),
	} ) );

function useSettingsState() {
	return useSyncExternalStore( subscribe, getState );
}

function Link( { href, children }: { href: string; children: ReactNode } ) {
	return (
		<a href={ href } target="_blank" rel="noreferrer noopener">
			{ children }
		</a>
	);
}

export function SettingsPanel() {
	const { settings, status } = useSettingsState();
	return (
		<div className="hesh-settings">
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Theme', 'html-editor-syntax-highlighter' ) }
				value={ settings.theme }
				options={ themeIds.map( ( id ) => ( {
					value: id,
					label: themeLabel( id ),
				} ) ) }
				onChange={ ( theme: string ) =>
					updateSettings( { theme: theme as ThemeId } )
				}
			/>
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ __( 'Key bindings', 'html-editor-syntax-highlighter' ) }
				value={ settings.keyMap }
				options={ keyMapIds.map( ( id ) => ( {
					value: id,
					label: keyMapLabels()[ id ],
				} ) ) }
				onChange={ ( keyMap: string ) =>
					updateSettings( { keyMap: keyMap as KeyMapId } )
				}
			/>
			<div className="hesh-settings__row">
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __(
						'Font size',
						'html-editor-syntax-highlighter'
					) }
					value={ String( settings.fontSize ) }
					options={ numberOptions(
						rangeValues( 'fontSize' ),
						( value ) =>
							sprintf(
								/* translators: %d: font size in pixels */
								__( '%dpx', 'html-editor-syntax-highlighter' ),
								value
							)
					) }
					onChange={ ( value: string ) =>
						updateSettings( { fontSize: Number( value ) } )
					}
				/>
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __(
						'Line height',
						'html-editor-syntax-highlighter'
					) }
					value={ String( settings.lineHeight ) }
					options={ numberOptions(
						rangeValues( 'lineHeight' ),
						String
					) }
					onChange={ ( value: string ) =>
						updateSettings( { lineHeight: Number( value ) } )
					}
				/>
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Tab size', 'html-editor-syntax-highlighter' ) }
					value={ String( settings.tabSize ) }
					options={ numberOptions(
						rangeValues( 'tabSize' ),
						String
					) }
					onChange={ ( value: string ) =>
						updateSettings( { tabSize: Number( value ) } )
					}
				/>
			</div>
			{ toggles().map( ( [ key, label ] ) => (
				<ToggleControl
					key={ key }
					__nextHasNoMarginBottom
					label={ label }
					checked={ settings[ key ] }
					onChange={ ( checked: boolean ) =>
						updateSettings( { [ key ]: checked } )
					}
				/>
			) ) }
			<p className="hesh-settings__status" role="status">
				{ status === 'error' &&
					__(
						'Your settings could not be saved.',
						'html-editor-syntax-highlighter'
					) }
			</p>
			<p className="hesh-settings__footer">
				<Link href="https://wordpress.org/support/plugin/html-editor-syntax-highlighter/reviews/#new-post">
					{ __( 'Leave a review', 'html-editor-syntax-highlighter' ) }
				</Link>
				{ ' · ' }
				<Link href="https://github.com/mukhortov/HESH-WordPress-Plugin/issues/new">
					{ __( 'Report a bug', 'html-editor-syntax-highlighter' ) }
				</Link>
				{ ' · ' }
				<Link href="https://github.com/mukhortov/HESH-WordPress-Plugin/">
					GitHub
				</Link>
				<br />
				{ createInterpolateElement(
					__(
						'Created by <peter>Peter Mukhortov</peter> and <james>James Bradford</james>.',
						'html-editor-syntax-highlighter'
					),
					{
						peter: (
							<Link href="https://mukhortov.com/">
								Peter Mukhortov
							</Link>
						),
						james: (
							<Link href="http://bradford.digital/">
								James Bradford
							</Link>
						),
					}
				) }
			</p>
		</div>
	);
}

/** A cog button that opens the settings. */
export function SettingsMenu() {
	return (
		<Dropdown
			className="hesh-settings-menu"
			contentClassName="hesh-settings-menu__content"
			popoverProps={ { placement: 'bottom-end' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					className="hesh-settings-menu__toggle"
					icon="admin-generic"
					label={ __(
						'Code editor settings',
						'html-editor-syntax-highlighter'
					) }
					aria-expanded={ isOpen }
					onClick={ onToggle }
					size="compact"
				/>
			) }
			renderContent={ () => <SettingsPanel /> }
		/>
	);
}

/**
 * Renders the settings button into `container`, returns a function that removes it.
 * @param container Element to render into.
 */
export function mountSettingsMenu( container: HTMLElement ): () => void {
	const root = createRoot( container );
	root.render( <SettingsMenu /> );
	return () => root.unmount();
}
