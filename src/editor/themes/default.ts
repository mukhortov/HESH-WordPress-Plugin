import { EditorView } from '@codemirror/view';
import {
	defaultHighlightStyle,
	syntaxHighlighting,
} from '@codemirror/language';

/** CodeMirror's own light colours. */
export const defaultTheme = [
	EditorView.theme(
		{ '&': { color: '#1e1e1e', backgroundColor: '#ffffff' } },
		{ dark: false }
	),
	syntaxHighlighting( defaultHighlightStyle ),
];
