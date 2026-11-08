// The WordPress globals the tests use inside page.evaluate().
interface WordPressGlobal {
	data: {
		select: (
			store: string
		) => Record< string, ( ...args: unknown[] ) => any >;
		dispatch: (
			store: string
		) => Record< string, ( ...args: unknown[] ) => any >;
		subscribe: ( listener: () => void ) => () => void;
	};
	apiFetch: < T = unknown >( options: {
		path: string;
		method?: string;
		data?: unknown;
	} ) => Promise< T >;
}

declare const wp: WordPressGlobal;

interface Window {
	send_to_editor: ( html: string ) => void;
	QTags: {
		addButton: (
			id: string,
			display: string,
			tagStart: string,
			tagEnd?: string
		) => void;
	};
	_wpemojiSettings?: unknown;
	heshSaveStarted?: boolean;
	switchEditors: { go: ( id: string, mode: 'tmce' | 'html' ) => void };
	setUserSetting: ( name: string, value: string ) => void;
	getUserSetting: ( name: string ) => string | undefined;
}
