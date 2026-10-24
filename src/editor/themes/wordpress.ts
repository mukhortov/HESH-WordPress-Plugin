/**
 * The "wordpress" theme by James Bradford, based on the CodeMirror Material
 * theme and the Chrome DevTools dark theme. Ported from the 2.x
 * src/theme/wordpress.less, keeping its colours.
 */
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const wpBlueBright = '#00b7ff';
const wpBlueLight = '#74d4fa';
const background = '#2a3036'; // lighten(rgb(35, 40, 45), 3%)
const foreground = '#e9eded';
const comment = '#546e7a';
const teal = '#80cbc4';
const yellow = '#decb6b';
const blue = '#82b1ff';

const theme = EditorView.theme(
	{
		'&': { color: foreground, backgroundColor: background },
		'.cm-content': { caretColor: '#f8f8f0' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f8f8f0' },
		'.cm-selectionBackground': {
			backgroundColor: 'rgba(255, 255, 255, 0.10)',
		},
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
			{
				backgroundColor: 'rgba(255, 255, 255, 0.15)',
			},
		'.cm-gutters': {
			backgroundColor: background,
			color: '#536d7f',
			border: 'none',
		},
		'.cm-activeLine, .cm-activeLineGutter': {
			backgroundColor: 'transparent',
		},
		'.cm-activeLineGutter': { color: '#8aa3b5' },
		'&.cm-focused .cm-matchingBracket': {
			color: '#ffffff !important',
			textDecoration: 'underline',
			backgroundColor: 'transparent',
		},
		'&.cm-focused .cm-nonmatchingBracket': { color: '#ec5f67' },
		'.cm-selectionMatch': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
		'.cm-searchMatch': { backgroundColor: 'rgba(0, 183, 255, 0.25)' },
		'.cm-searchMatch.cm-searchMatch-selected': {
			backgroundColor: 'rgba(0, 183, 255, 0.45)',
		},
		'.cm-foldPlaceholder': {
			backgroundColor: 'transparent',
			border: 'none',
			color: comment,
		},
		'.cm-panels': { backgroundColor: '#23282d', color: foreground },
		'.cm-tooltip': { backgroundColor: '#23282d', color: foreground },
	},
	{ dark: true }
);

const highlightStyle = HighlightStyle.define( [
	{ tag: t.keyword, color: '#c792ea' },
	{ tag: [ t.operator, t.punctuation ], color: '#bbd1d1' },
	{ tag: t.special( t.variableName ), color: teal },
	{ tag: [ t.typeName, t.className, t.namespace ], color: yellow },
	{
		tag: [ t.standard( t.variableName ), t.definition( t.variableName ) ],
		color: yellow,
	},
	{ tag: [ t.atom, t.bool, t.number, t.unit ], color: wpBlueBright },
	{ tag: [ t.string, t.attributeValue ], color: '#fa956d' },
	{ tag: [ t.special( t.string ), t.regexp, t.escape ], color: teal },
	{ tag: t.comment, color: comment },
	{ tag: t.variableName, color: blue },
	{ tag: [ t.tagName, t.angleBracket ], color: wpBlueBright },
	{ tag: [ t.meta, t.processingInstruction, t.documentMeta ], color: teal },
	{ tag: t.attributeName, color: wpBlueLight },
	{ tag: t.propertyName, color: '#80cbae' },
	{ tag: [ t.labelName, t.character ], color: yellow },
	{ tag: t.link, textDecoration: 'underline' },
	{ tag: t.invalid, color: '#ffffff', backgroundColor: '#ec5f67' },
] );

export const wordpressTheme = [ theme, syntaxHighlighting( highlightStyle ) ];
