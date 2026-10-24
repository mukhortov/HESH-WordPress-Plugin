/** What PHP passes to the page, see HESH_Assets::enqueue(). */
export interface Config {
	/** The user's `hesh_settings` meta, merged with the defaults. */
	settings: unknown;
	postId: number;
}

declare global {
	interface Window {
		heshConfig?: Config;
	}
}

export function getConfig(): Config {
	return window.heshConfig ?? { settings: {}, postId: 0 };
}
