/**
 * The Classic editor's Text (Code) tab: CodeMirror is laid over the post
 * textarea, which stays in the page so WordPress can size, read and write it.
 */
import { __ } from '@wordpress/i18n';
import { keymap, showPanel, EditorView } from '@codemirror/view';
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

// the part of jQuery used to hear WordPress's autosave events and to tell the full-height editor to adjust
interface JQueryEvents {
	one: ( events: string, handler: () => void ) => void;
	off: ( events: string, handler: () => void ) => void;
	trigger: ( event: string ) => void;
}

declare global {
	interface Window {
		wpActiveEditor?: string;
		jQuery?: ( element: Document ) => JQueryEvents;
	}
}

const fullscreenClass = 'hesh-fullscreen';

function postId(): number {
	const field = document.getElementById(
		'post_ID'
	) as HTMLInputElement | null;
	return Number( field?.value ) || getConfig().postId;
}

// a save waiting for an autosave to finish, so that pressing Ctrl+S again saves once
let waitingToSave = false;

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
	if ( ! button || waitingToSave ) {
		return true;
	}
	if ( ! button.classList.contains( 'disabled' ) ) {
		button.click();
		return true;
	}
	// WordPress ignores clicks on the save buttons during an autosave (leaving
	// the title of a new post starts one), so click once it has finished
	waitingToSave = true;
	const saveButton: HTMLElement = button;
	const $document = window.jQuery?.( document );
	function save() {
		clearTimeout( fallback );
		$document?.off( 'autosave-enable-buttons', save );
		waitingToSave = false;
		saveButton.click();
	}
	$document?.one( 'autosave-enable-buttons', save );
	// autosave.js enables the buttons after 5 seconds at the latest
	const fallback = setTimeout( save, 6000 );
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
	// Quicktags rebuilds the toolbar with innerHTML when it starts after this
	// (jQuery's ready callbacks can run after the load event) and whenever a
	// button is added, which removes these buttons: put them back each time.
	new MutationObserver( () => {
		if ( ! toolbar.contains( tools ) ) {
			toolbar.appendChild( tools );
		}
	} ).observe( toolbar, { childList: true } );
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
	// Where the bars fixed to the top of the window end: the admin bar (not on
	// phones) and the editor tabs and toolbar that the full-height editor
	// (editor-expand.js) pins below it as the page scrolls, once the textarea
	// is taller than its 300px least height and padding. Those count as pinned
	// all the time: WordPress may pin them after CodeMirror has measured for a
	// scroll, past the end of the editor it parks them over the last lines,
	// from where they come down as the page scrolls back, and where they rest
	// above the code they don't reach further down than when pinned.
	const adminBar = document.getElementById( 'wpadminbar' );
	const editorBars = [
		document.getElementById( 'wp-content-editor-tools' ),
		toolbar,
	].filter( ( bar ): bar is HTMLElement => bar !== null );
	const fixedBarsBottom = () => {
		if ( isFullscreen() ) {
			return 0;
		}
		const adminBarBottom =
			adminBar && getComputedStyle( adminBar ).position === 'fixed'
				? adminBar.getBoundingClientRect().bottom
				: 0;
		const pinnable =
			isFullHeight() &&
			( textarea.offsetHeight > 325 ||
				editorBars.some(
					( bar ) => getComputedStyle( bar ).position === 'fixed'
				) );
		return pinnable
			? editorBars.reduce(
					( bottom, bar ) => bottom + bar.offsetHeight,
					adminBarBottom
				)
			: adminBarBottom;
	};

	const container = document.createElement( 'div' );
	container.className = 'hesh-classic-editor';

	// The full-height editor (editor-expand.js) grows the textarea to fit the
	// code, but shrinks it only when the text gets shorter. Shrink it when the
	// code takes less room too: a panel closed, or CodeMirror measured lines it
	// had first guessed taller (long wrapped lines).
	const shrinkToFit = () => {
		if ( ! isFullHeight() || ! isTextMode() || isFullscreen() ) {
			return;
		}
		// editor-expand.js's smallest height
		const height = Math.max( 300, textarea.scrollHeight );
		if ( parseInt( textarea.style.height, 10 ) > height ) {
			textarea.style.height = `${ height }px`;
			// move the bars and the status bar to the new end
			window.jQuery?.( document ).trigger( 'editor-classchange' );
		}
	};

	// tell WordPress about changes: word count, autosave and the full-height editor listen for input
	let notifyTimer: ReturnType< typeof setTimeout > | undefined;
	const notify = () => {
		clearTimeout( notifyTimer );
		notifyTimer = setTimeout( () => {
			shrinkToFit();
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
		stickyTop: fixedBarsBottom,
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
				} else if (
					update.heightChanged ||
					// a panel (search, Vim's command line) opened or closed
					update.state.facet( showPanel ) !==
						update.startState.facet( showPanel )
				) {
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

	// Undo doesn't reach back across a visit to the Visual tab, as in core's
	// textarea: switching tabs rewrites the content, with TinyMCE's bookmark
	// markup in between, while WordPress still counts the Text tab as open.
	// The class's earlier values show a visit made and ended in one go too.
	new MutationObserver( ( records ) => {
		if (
			isTextMode() &&
			records.some( ( record ) =>
				/\btmce-active\b/.test( record.oldValue ?? '' )
			)
		) {
			editor?.clearHistory();
		}
	} ).observe( wrap, {
		attributes: true,
		attributeFilter: [ 'class' ],
		attributeOldValue: true,
	} );

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
	// The full-height editor sizes the textarea by CodeMirror's height, known
	// once it has measured its lines. Scroll to the saved place after that, or
	// the page lands where the line was before the editor grew.
	if ( isFullHeight() && isTextMode() ) {
		await new Promise( ( resolve ) =>
			view.requestMeasure( {
				read() {},
				write: () => setTimeout( resolve ),
			} )
		);
		shrinkToFit();
		textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		layout();
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
