import type { Extension } from '@codemirror/state';
import type { ThemeId } from '../../settings/settings';
import { wordpressTheme } from './wordpress';
import { defaultTheme } from './default';

export interface ThemeInfo {
	/** Theme names are not translated, `default` is labelled in the settings UI. */
	label: string;
	dark: boolean;
	load: () => Promise< Extension >;
}

// The default themes are bundled, the rest load on demand as separate chunks.
export const themes: Record< ThemeId, ThemeInfo > = {
	wordpress: {
		label: 'WordPress',
		dark: true,
		load: async () => wordpressTheme,
	},
	default: { label: 'Default', dark: false, load: async () => defaultTheme },
	'one-dark': {
		label: 'One Dark',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-one-dark" */ '@codemirror/theme-one-dark'
			).then( ( m ) => m.oneDark ),
	},
	'github-light': {
		label: 'GitHub Light',
		dark: false,
		load: () =>
			import(
				/* webpackChunkName: "theme-github" */ '@uiw/codemirror-theme-github'
			).then( ( m ) => m.githubLight ),
	},
	'github-dark': {
		label: 'GitHub Dark',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-github" */ '@uiw/codemirror-theme-github'
			).then( ( m ) => m.githubDark ),
	},
	dracula: {
		label: 'Dracula',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-dracula" */ '@uiw/codemirror-theme-dracula'
			).then( ( m ) => m.dracula ),
	},
	monokai: {
		label: 'Monokai',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-monokai" */ '@uiw/codemirror-theme-monokai'
			).then( ( m ) => m.monokai ),
	},
	'material-dark': {
		label: 'Material Dark',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-material" */ '@uiw/codemirror-theme-material'
			).then( ( m ) => m.materialDark ),
	},
	nord: {
		label: 'Nord',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-nord" */ '@uiw/codemirror-theme-nord'
			).then( ( m ) => m.nord ),
	},
	'solarized-light': {
		label: 'Solarized Light',
		dark: false,
		load: () =>
			import(
				/* webpackChunkName: "theme-solarized" */ '@uiw/codemirror-theme-solarized'
			).then( ( m ) => m.solarizedLight ),
	},
	'solarized-dark': {
		label: 'Solarized Dark',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-solarized" */ '@uiw/codemirror-theme-solarized'
			).then( ( m ) => m.solarizedDark ),
	},
	'gruvbox-dark': {
		label: 'Gruvbox Dark',
		dark: true,
		load: () =>
			import(
				/* webpackChunkName: "theme-gruvbox" */ '@uiw/codemirror-theme-gruvbox-dark'
			).then( ( m ) => m.gruvboxDark ),
	},
	eclipse: {
		label: 'Eclipse',
		dark: false,
		load: () =>
			import(
				/* webpackChunkName: "theme-eclipse" */ '@uiw/codemirror-theme-eclipse'
			).then( ( m ) => m.eclipse ),
	},
};
