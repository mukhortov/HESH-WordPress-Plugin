// The WordPress globals the tests use inside page.evaluate().
interface WordPressGlobal {
	data: {
		select: (
			store: string
		) => Record< string, ( ...args: unknown[] ) => any >;
		dispatch: (
			store: string
		) => Record< string, ( ...args: unknown[] ) => any >;
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
}
