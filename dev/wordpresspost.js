// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (mod) {
	if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
		mod(require('../../lib/codemirror'), require('../xml/xml'), require('../javascript/javascript'), require('../css/css'));
	} else if (typeof define === 'function' && define.amd) { // AMD
		define(['../../lib/codemirror', '../xml/xml', '../javascript/javascript', '../css/css'], mod);
	} else { // Plain browser env
		mod(CodeMirror);
	}
}(function (CodeMirror) {
	'use strict';

	CodeMirror.defineMode('wordpresspost', function (config, parserConfig) {

		var htmlmixedMode = CodeMirror.getMode(config, {
			name: 'htmlmixed',
			multilineTagIndentFactor: parserConfig.multilineTagIndentFactor,
			multilineTagIndentPastTag: parserConfig.multilineTagIndentPastTag
		});

		var shortcodeMode = CodeMirror.getMode(config, {
			name: 'shortcode',
			multilineTagIndentFactor: parserConfig.multilineTagIndentFactor,
			multilineTagIndentPastTag: parserConfig.multilineTagIndentPastTag
		});

		function shortcodeToken (stream, state) {
			state.isInShortcode = true;
			var style = shortcodeMode.token(stream, state.shortcodeState);
			var inText = state.shortcodeState.tagName === null;
			if (inText && !/^\[/.test(stream.current())) {
				state.token = htmlmixedToken;
			}
			return style;
		}

		function htmlmixedToken (stream, state) {
			state.isInShortcode = false;
			var style = htmlmixedMode.token(stream, state.htmlmixedState);
			var inText = state.htmlmixedState.htmlState.tagName === null;
			if (inText && /\[/.test(stream.current()) && !state.htmlmixedState.localState && style === null) {
				var cur = stream.current();
				var open = cur.search(/\[/);
				stream.backUp(cur.length - open);
				if (state.shortcodeState == null) { // ===null or ===undefined
					state.shortcodeState = CodeMirror.startState(shortcodeMode, htmlmixedMode.indent(state.htmlmixedState, ''));
				}
				state.token = shortcodeToken;
			}
			return style;
		}

		return {
			startState: function () {
				var state = htmlmixedMode.startState();
				return {
					token: htmlmixedToken,
					isInShortcode: false,
					shortcodeState: null,
					htmlmixedState: state
				};
			},

			copyState: function (state) {
				var shortcodeStateProx;
				if (state.shortcodeState) {
					shortcodeStateProx = CodeMirror.copyState(shortcodeMode, state.shortcodeState);
				}
				return {
					token: state.token,
					shortcodeState: shortcodeStateProx,
					htmlmixedState: CodeMirror.copyState(htmlmixedMode, state.htmlmixedState)
				};
			},

			token: function (stream, state) {
				return state.token(stream, state);
			},

			indent: function (state, textAfter) {
				if (state.isInShortcode) return htmlmixedMode.indent(state.htmlmixedState, textAfter);
				else if (!state.isInShortcode) return shortcodeMode.indent(state.shortcodeState, textAfter);
				else return CodeMirror.Pass;
			},

			innerMode: function (state) {
				if (state.isInShortcode) {
					return {
						state: state.shortcodeState,
						mode: shortcodeMode
					};
				} else {
					return {
						state: state.htmlmixedState,
						mode: htmlmixedMode
					};
				}
			}
		};
	}, 'htmlmixed', 'shortcode');

}));
