/**
 * The Classic editor's Text (Code) tab: CodeMirror is laid over the post
 * textarea, which stays in the page so WordPress can size, read and write it.
 */
import { __ } from '@wordpress/i18n';
import { keymap, EditorView } from '@codemirror/view';
import { EditorSelection, Prec } from '@codemirror/state';
import { searchPanelOpen } from '@codemirror/search';
import { createEditor, type Editor } from '../editor/editor';
import { minimalChange } from '../editor/diff';
import {
	rememberSelection,
	restoreSelection,
} from '../editor/selection-memory';
import { getConfig } from '../config';
import {
	getSettings,
	subscribe as subscribeToSettings,
} from '../settings/store';
import { mountSettingsMenu } from '../settings/SettingsMenu';
import { attachTextareaFacade, type Facade } from './textarea-facade';
import './index.scss';
import '../settings/settings.scss';

declare global {
	interface Window {
		wpActiveEditor?: string;
	}
}

const fullscreenClass = 'hesh-fullscreen';

function postId(): number {
	const field = document.getElementById(
		'post_ID'
	) as HTMLInputElement | null;
	return Number( field?.value ) || getConfig().postId;
}

// WordPress ignores clicks on the save buttons while an autosave runs (they
// get the `disabled` class, for up to 5 seconds), so click once it is done.
function clickWhenEnabled( button: HTMLElement, deadline: number ): void {
	if ( ! button.classList.contains( 'disabled' ) || Date.now() > deadline ) {
		button.click();
	} else {
		setTimeout( () => clickWhenEnabled( button, deadline ), 100 );
	}
}

// Ctrl/Cmd+S: Save Draft for drafts, otherwise Update or Publish
function savePost(): boolean {
	const button = [ 'save-post', 'publish', 'submit' ]
		.map(
			( id ) => document.getElementById( id ) as HTMLInputElement | null
		)
		.find(
			( element ) =>
				element && ! element.disabled && element.offsetParent !== null
		);
	if ( button ) {
		clickWhenEnabled( button, Date.now() + 10000 );
	}
	return true;
}

// fullscreen and settings buttons at the end of the Quicktags toolbar
function addToolbarButtons(
	toolbar: HTMLElement,
	toggleFullscreen: () => void
): void {
	const tools = document.createElement( 'span' );
	tools.className = 'hesh-toolbar';
	const fullscreenButton = document.createElement( 'button' );
	fullscreenButton.type = 'button';
	fullscreenButton.className =
		'ed_button button button-small hesh-fullscreen-toggle';
	fullscreenButton.title = __(
		'Fullscreen (F11)',
		'html-editor-syntax-highlighter'
	);
	fullscreenButton.setAttribute( 'aria-label', fullscreenButton.title );
	fullscreenButton.addEventListener( 'click', toggleFullscreen );
	const settingsSlot = document.createElement( 'span' );
	tools.append( fullscreenButton, settingsSlot );
	toolbar.appendChild( tools );
	mountSettingsMenu( settingsSlot );
}

async function start(): Promise< void > {
	const textarea = document.getElementById(
		'content'
	) as HTMLTextAreaElement | null;
	const wrap = document.getElementById( 'wp-content-wrap' );
	const editorContainer = document.getElementById(
		'wp-content-editor-container'
	);
	if ( ! textarea || ! wrap || ! editorContainer ) {
		return;
	}
	const toolbar =
		document.getElementById( 'ed_toolbar' ) ??
		document.getElementById( 'qt_content_toolbar' );

	const isTextMode = () => ! wrap.classList.contains( 'tmce-active' );
	const isFullscreen = () =>
		editorContainer.classList.contains( fullscreenClass );
	// with the full-height editor, WordPress has its own distraction-free mode instead
	const isFullHeight = () =>
		document
			.getElementById( 'postdivrich' )
			?.classList.contains( 'wp-editor-expand' ) ?? false;

	const container = document.createElement( 'div' );
	container.className = 'hesh-classic-editor';

	// tell WordPress about changes: word count, autosave and the full-height editor listen for input
	let notifyTimer: ReturnType< typeof setTimeout > | undefined;
	const notify = () => {
		clearTimeout( notifyTimer );
		notifyTimer = setTimeout( () => {
			textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		}, 0 );
	};

	let editor: Editor | null = null;
	const toggleFullscreen = ( force?: boolean ) => {
		const on = force ?? ( ! isFullscreen() && ! isFullHeight() );
		editorContainer.classList.toggle( fullscreenClass, on );
		document.body.classList.toggle( 'hesh-has-fullscreen', on );
		layout();
		editor?.view.focus();
		return true;
	};

	let facade: Facade | undefined;
	const id = postId();
	const doc = textarea.value;
	editor = await createEditor( {
		parent: container,
		doc,
		settings: getSettings(),
		extensions: [
			Prec.high(
				keymap.of( [
					{ key: 'Mod-s', run: savePost, preventDefault: true },
					{
						key: 'F11',
						run: () => ! isFullHeight() && toggleFullscreen(),
					},
					{
						key: 'Escape',
						// Escape closes the search panel first, and belongs to Vim
						run: ( target ) =>
							isFullscreen() &&
							! searchPanelOpen( target.state ) &&
							getSettings().keyMap !== 'vim' &&
							toggleFullscreen( false ),
					},
				] )
			),
			EditorView.updateListener.of( ( update ) => {
				if ( update.docChanged ) {
					facade?.sync();
					notify();
				} else if ( update.heightChanged ) {
					notify();
				}
			} ),
			EditorView.domEventHandlers( {
				focus() {
					window.wpActiveEditor = textarea.id;
				},
			} ),
			rememberSelection( id ),
		],
	} );
	const { view } = editor;

	// The textarea kept working while the theme and keymap loaded: bring in what
	// was typed, inserted or restored there, and carry on where the cursor was.
	const hadFocus = textarea.ownerDocument.activeElement === textarea;
	const typed = textarea.value;
	if ( typed !== doc ) {
		view.dispatch( { changes: minimalChange( doc, typed ) } );
	}
	if ( hadFocus ) {
		const length = view.state.doc.length;
		view.dispatch( {
			selection: EditorSelection.single(
				Math.min( textarea.selectionStart, length ),
				Math.min( textarea.selectionEnd, length )
			),
			scrollIntoView: true,
		} );
	}

	try {
		// changes written to the textarea while the Visual tab is open come from TinyMCE, not the user
		facade = attachTextareaFacade( textarea, view, {
			addToHistory: isTextMode,
		} );
		editorContainer.appendChild( container );
		textarea.classList.add( 'hesh-textarea' );
		document.body.classList.add( 'hesh-classic-active' );
		if ( toolbar ) {
			addToolbarButtons( toolbar, () => toggleFullscreen() );
		}
	} catch ( error ) {
		// leave core's textarea as it was
		facade?.detach();
		container.remove();
		textarea.classList.remove( 'hesh-textarea' );
		document.body.classList.remove( 'hesh-classic-active' );
		editor.destroy();
		throw error;
	}

	// follow the textarea's position and size: WordPress resizes it (drag handle,
	// full-height editor) and moves it (margin under a pinned toolbar)
	function layout(): void {
		if ( isFullscreen() ) {
			container.removeAttribute( 'style' );
		} else {
			Object.assign( container.style, {
				top: `${ textarea!.offsetTop }px`,
				left: `${ textarea!.offsetLeft }px`,
				width: `${ textarea!.offsetWidth }px`,
				height: `${ textarea!.offsetHeight }px`,
			} );
		}
		view.requestMeasure();
	}
	layout();
	const resizeObserver = new ResizeObserver( layout );
	resizeObserver.observe( textarea );
	resizeObserver.observe( editorContainer );
	new MutationObserver( layout ).observe( textarea, {
		attributes: true,
		attributeFilter: [ 'style' ],
	} );
	new MutationObserver( layout ).observe( wrap, {
		attributes: true,
		attributeFilter: [ 'class' ],
	} );
	window.addEventListener( 'resize', layout );

	subscribeToSettings( ( state ) => {
		editor?.applySettings( state.settings );
	} );

	if ( hadFocus ) {
		view.focus();
		return;
	}
	restoreSelection( view, id );
	// carry on typing straight away when coming back to a post, like 2.x
	const title = document.getElementById( 'title' ) as HTMLInputElement | null;
	if (
		isTextMode() &&
		title?.value &&
		textarea.ownerDocument.activeElement === textarea.ownerDocument.body
	) {
		view.focus();
	}
}

function startSafely(): void {
	start().catch( ( error ) => {
		// eslint-disable-next-line no-console
		console.error(
			'HTML Editor Syntax Highlighter could not start:',
			error
		);
	} );
}

if ( document.readyState === 'complete' ) {
	startSafely();
}
// after Quicktags, TinyMCE and editor-expand.js have set up the editor
else {
	window.addEventListener( 'load', startSafely );
}
