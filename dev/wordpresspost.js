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

		function wordpresspost (stream, state) {
			var style = htmlmixedMode.token(stream, state.htmlState);
			var text = style === null;
			if (text && /\[/.test(stream.current())) {
				var cur = stream.current();
				var open = cur.search(/\[/);
				if (open > -1) {
					stream.backUp(cur.length - open);
				}
				state.token = function (stream, state) {
					var style = state.localMode.token(stream, state.localState);
					if (state.startHTMLafter === 2) {
						state.startHTMLafter = null;
						state.token = wordpresspost;
						state.localState = state.localMode = null;
						stream.backUp(stream.current().length);
						return null;
					} else if (style === 'tag bracket' || style === 'tag bracket error') {
						state.startHTMLafter++;
						if (state.startHTMLafter === 2) {
							var cur = stream.current();
							var close = cur.search(/\]/);
							if (close > -1) {
								stream.backUp(cur.length - close - 1);
							}
						}
					}
					return style;
				};
				state.startHTMLafter = 0;
				state.localMode = shortcodeMode;
				state.localState = CodeMirror.startState(shortcodeMode, htmlmixedMode.indent(state.htmlState, ''));
			}
			return style;
		}

		return {
			startState: function () {
				var state = htmlmixedMode.startState();
				return {
					token: wordpresspost,
					inTag: null,
					localMode: null,
					localState: null,
					htmlState: state
				};
			},

			copyState: function (state) {
				var local;
				if (state.localState) {
					local = CodeMirror.copyState(state.localMode, state.localState);
				}
				return {
					token: state.token,
					inTag: state.inTag,
					localMode: state.localMode,
					localState: local,
					htmlState: CodeMirror.copyState(htmlmixedMode, state.htmlState)
				};
			},

			token: function (stream, state) {
				return state.token(stream, state);
			},

			indent: function (state, textAfter) {
				if (!state.localMode || /^\s*<\//.test(textAfter)) {
					return htmlmixedMode.indent(state.htmlState, textAfter);
				} else if (state.localMode.indent) {
					return state.localMode.indent(state.localState, textAfter);
				} else {
					return CodeMirror.Pass;
				}
			},

			innerMode: function (state) {
				return {
					state: state.localState || state.htmlState,
					mode: state.localMode || htmlmixedMode
				};
			}
		};
	}, 'htmlmixed', 'shortcode');

}));
