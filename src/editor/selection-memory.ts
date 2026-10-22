import { EditorSelection, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * Restores the cursor and scroll position after the page reloads, per post.
 * 2.x kept this in a cookie, it lives in localStorage now.
 */

interface Saved {
	anchor: number;
	head: number;
	/** Document position at the top of the visible area. */
	top: number;
}

const key = ( postId: number ) => `hesh-selection-${ postId }`;

function read( postId: number ): Saved | null {
	try {
		const saved = JSON.parse(
			window.localStorage.getItem( key( postId ) ) ?? 'null'
		);
		if (
			saved &&
			[ saved.anchor, saved.head, saved.top ].every( Number.isInteger )
		) {
			return saved as Saved;
		}
	} catch {
		// storage blocked or unreadable, start at the top
	}
	return null;
}

function write( postId: number, saved: Saved ): void {
	try {
		window.localStorage.setItem( key( postId ), JSON.stringify( saved ) );
	} catch {
		// storage full or blocked
	}
}

/**
 * Moves the cursor back to where it was when the post was last edited.
 * @param view   The editor.
 * @param postId The post being edited.
 */
export function restoreSelection( view: EditorView, postId: number ): void {
	const saved = postId ? read( postId ) : null;
	if ( ! saved ) {
		return;
	}
	const length = view.state.doc.length;
	const clamp = ( pos: number ) => Math.min( Math.max( pos, 0 ), length );
	view.dispatch( {
		selection: EditorSelection.single(
			clamp( saved.anchor ),
			clamp( saved.head )
		),
		effects: EditorView.scrollIntoView( clamp( saved.top ), {
			y: 'start',
		} ),
	} );
}

/**
 * Saves the cursor position as it moves, and when the page or editor closes.
 * @param postId The post being edited.
 */
export function rememberSelection( postId: number ): Extension {
	if ( ! postId ) {
		return [];
	}
	return ViewPlugin.fromClass(
		class {
			timer: ReturnType< typeof setTimeout > | undefined;
			constructor( readonly view: EditorView ) {
				this.save = this.save.bind( this );
				window.addEventListener( 'pagehide', this.save );
			}
			update( update: ViewUpdate ) {
				if ( update.selectionSet || update.docChanged ) {
					this.schedule();
				}
			}
			schedule() {
				if ( this.timer === undefined ) {
					this.timer = setTimeout( this.save, 250 );
				}
			}
			save() {
				clearTimeout( this.timer );
				this.timer = undefined;
				const { view } = this;
				const { anchor, head } = view.state.selection.main;
				const visibleTop = Math.max(
					view.scrollDOM.getBoundingClientRect().top,
					0
				);
				const top = view.lineBlockAtHeight(
					Math.max( 0, visibleTop - view.documentTop )
				).from;
				write( postId, { anchor, head, top } );
			}
			destroy() {
				window.removeEventListener( 'pagehide', this.save );
				this.save();
			}
		},
		{
			eventHandlers: {
				scroll() {
					this.schedule();
				},
			},
		}
	);
}
