/**
 * The block editor's Code Editor: CodeMirror replaces the post content
 * textarea while the editor is in code view.
 */
import domReady from '@wordpress/dom-ready';
import { dispatch, select, subscribe } from '@wordpress/data';
import { Annotation, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { createEditor, type Editor } from '../editor/editor';
import { minimalChange } from '../editor/diff';
import {
	rememberSelection,
	restoreSelection,
} from '../editor/selection-memory';
import {
	getSettings,
	subscribe as subscribeToSettings,
} from '../settings/store';
import { mountSettingsMenu } from '../settings/SettingsMenu';
import './index.scss';
import '../settings/settings.scss';

interface EditorSelectors {
	getCurrentPostType: () => string | null;
	getCurrentPostId: () => number | string | null;
	getEditedPostContent: () => string;
	/** core/editor since WordPress 6.6 */
	getEditorMode?: () => string;
}

interface CoreSelectors {
	getEntityRecordEdits: (
		kind: string,
		name: string,
		key: number | string
	) => unknown;
}

interface CoreActions {
	editEntityRecord: (
		kind: string,
		name: string,
		key: number | string,
		edits: Record< string, unknown >
	) => void;
}

// The textarea keeps its class from WordPress 6.5 (inside .edit-post-text-editor__body)
// to 7.x (inside .editor-text-editor__body).
const textareaSelector =
	'.editor-text-editor__body textarea.editor-post-text-editor, .edit-post-text-editor__body textarea.editor-post-text-editor';
const toolbarSelector =
	'.editor-text-editor__toolbar, .edit-post-text-editor__toolbar';

const editorStore = () => select( 'core/editor' ) as unknown as EditorSelectors;

function editorMode(): string {
	const store = editorStore();
	if ( typeof store.getEditorMode === 'function' ) {
		return store.getEditorMode();
	}
	// WordPress 6.5
	return (
		select( 'core/edit-post' ) as unknown as { getEditorMode: () => string }
	 ).getEditorMode();
}

function currentPost(): { type: string; id: number | string } | null {
	const store = editorStore();
	const type = store.getCurrentPostType();
	const id = store.getCurrentPostId();
	return type && id ? { type, id } : null;
}

/** Marks transactions that bring in content changed outside CodeMirror. */
const fromStore = Annotation.define< boolean >();

interface Session {
	textarea: HTMLTextAreaElement;
	editor: Editor;
	container: HTMLElement;
	cleanup: () => void;
	/** The content CodeMirror and the store last agreed on. */
	synced: string;
	/** Edits object last seen, cheap to compare before serializing the post. */
	edits: unknown;
}

let session: Session | null = null;
let starting: HTMLTextAreaElement | null = null;
// textareas CodeMirror failed to start on, which keep core's editor
const failed = new WeakSet< HTMLTextAreaElement >();

// Write every change to the post the way core's code editor textarea does.
// The block editor parses the blocks from the content again when it needs them.
function push( content: string ): void {
	const post = currentPost();
	if ( ! session || ! post ) {
		return;
	}
	session.synced = content;
	( dispatch( 'core' ) as unknown as CoreActions ).editEntityRecord(
		'postType',
		post.type,
		post.id,
		{
			content,
			blocks: undefined,
			selection: undefined,
		}
	);
}

// Bring in changes made outside CodeMirror: the toolbar undo button,
// content filtered by the server on save, another plugin editing the post.
function pull(): void {
	const post = currentPost();
	if ( ! session || ! post ) {
		return;
	}
	const edits = (
		select( 'core' ) as unknown as CoreSelectors
	 ).getEntityRecordEdits( 'postType', post.type, post.id );
	if ( edits === session.edits ) {
		return;
	}
	session.edits = edits;
	const content = editorStore().getEditedPostContent();
	if ( content === session.synced ) {
		return;
	}
	session.synced = content;
	const { view } = session.editor;
	const current = view.state.doc.toString();
	if ( content === current ) {
		return;
	}
	view.dispatch( {
		changes: minimalChange( current, content ),
		annotations: [
			fromStore.of( true ),
			Transaction.addToHistory.of( false ),
		],
	} );
}

// Store updates can arrive while CodeMirror is still applying the change that
// caused them, so look at them once that is done.
let pullScheduled = false;
function schedulePull(): void {
	if ( pullScheduled ) {
		return;
	}
	pullScheduled = true;
	queueMicrotask( () => {
		pullScheduled = false;
		pull();
	} );
}

const pushChanges = EditorView.updateListener.of( ( update ) => {
	if (
		update.docChanged &&
		! update.transactions.every( ( tr ) => tr.annotation( fromStore ) )
	) {
		push( update.state.doc.toString() );
	}
} );

// CodeMirror keeps its own undo history, so the block editor's undo and redo
// shortcuts must not also revert the post. The listener is on the whole editor,
// panels included (search, Vim's command line), and outside CodeMirror's own
// handlers, which stop once its keymap has handled a key.
function isUndoOrRedo( event: KeyboardEvent ): boolean {
	const key = event.key.toLowerCase();
	return ( event.ctrlKey || event.metaKey ) && ( key === 'z' || key === 'y' );
}

const keepUndoInCodeMirror = ViewPlugin.define( ( view ) => {
	const stopUndo = ( event: KeyboardEvent ) => {
		if ( isUndoOrRedo( event ) ) {
			event.stopPropagation();
		}
	};
	view.dom.addEventListener( 'keydown', stopUndo );
	return {
		destroy: () => view.dom.removeEventListener( 'keydown', stopUndo ),
	};
} );

function mountSettings(
	textarea: HTMLTextAreaElement,
	container: HTMLElement
): () => void {
	const toolbar = textarea
		.closest( '.editor-text-editor, .edit-post-text-editor' )
		?.querySelector( toolbarSelector );
	const slot = document.createElement( 'div' );
	slot.className = toolbar
		? 'hesh-toolbar-settings'
		: 'hesh-floating-settings';
	if ( toolbar ) {
		toolbar.insertBefore( slot, toolbar.lastElementChild );
	} else {
		container.prepend( slot );
	}
	const unmount = mountSettingsMenu( slot );
	return () => {
		unmount();
		slot.remove();
	};
}

async function start( textarea: HTMLTextAreaElement ): Promise< void > {
	const post = currentPost();
	if ( ! post ) {
		return;
	}
	starting = textarea;
	const container = document.createElement( 'div' );
	container.className = 'hesh-block-editor';
	const content = editorStore().getEditedPostContent();
	const postId = Number( post.id ) || 0;
	let editor: Editor;
	try {
		editor = await createEditor( {
			parent: container,
			doc: content,
			settings: getSettings(),
			extensions: [
				pushChanges,
				keepUndoInCodeMirror,
				rememberSelection( postId ),
			],
		} );
	} finally {
		if ( starting === textarea ) {
			starting = null;
		}
	}
	// the user may have left code view while the theme or keymap loaded
	if ( ! textarea.isConnected || editorMode() !== 'text' ) {
		editor.destroy();
		return;
	}
	let unmountSettings = () => {};
	try {
		textarea.after( container );
		textarea.classList.add( 'hesh-hidden' );
		unmountSettings = mountSettings( textarea, container );
	} catch ( error ) {
		// leave core's textarea as it was
		unmountSettings();
		container.remove();
		textarea.classList.remove( 'hesh-hidden' );
		editor.destroy();
		throw error;
	}
	const unsubscribeSettings = subscribeToSettings( ( state ) => {
		editor.applySettings( state.settings );
	} );
	session = {
		textarea,
		editor,
		container,
		synced: content,
		edits: null,
		cleanup() {
			unsubscribeSettings();
			unmountSettings();
			textarea.classList.remove( 'hesh-hidden' );
		},
	};
	pull(); // anything typed into the textarea while CodeMirror loaded
	restoreSelection( editor.view, postId );
}

function stop(): void {
	if ( ! session ) {
		return;
	}
	const { editor, container, cleanup } = session;
	session = null;
	cleanup();
	editor.destroy();
	container.remove();
}

// Start or stop to match the current editor mode and textarea. React may also
// replace the textarea without a mode change, so this runs on DOM changes too.
function reconcile(): void {
	const textarea =
		currentPost() && editorMode() === 'text'
			? document.querySelector< HTMLTextAreaElement >( textareaSelector )
			: null;
	if ( session && session.textarea !== textarea ) {
		stop();
	}
	if (
		! session &&
		textarea &&
		starting !== textarea &&
		! failed.has( textarea )
	) {
		start( textarea ).catch( ( error ) => {
			failed.add( textarea );
			// eslint-disable-next-line no-console
			console.error(
				'HTML Editor Syntax Highlighter could not start:',
				error
			);
		} );
	}
	watchDom( editorMode() === 'text' );
}

let observer: MutationObserver | null = null;

function watchDom( watch: boolean ): void {
	if ( ! watch ) {
		observer?.disconnect();
		observer = null;
		return;
	}
	if ( observer ) {
		return;
	}
	observer = new MutationObserver( ( records ) => {
		// CodeMirror's own DOM changes on every keystroke, skip those
		if (
			records.some(
				( record ) => ! session?.container.contains( record.target )
			)
		) {
			reconcile();
		}
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
}

domReady( () => {
	let mode: string | null = null;
	subscribe( () => {
		if ( ! currentPost() ) {
			return;
		}
		const nextMode = editorMode();
		if ( nextMode !== mode ) {
			mode = nextMode;
			reconcile();
		} else {
			schedulePull();
		}
	} );
	reconcile();
} );
