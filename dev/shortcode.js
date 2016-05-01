// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (mod) {
	if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
		mod(require('../../lib/codemirror'));
	} else if (typeof define === 'function' && define.amd) { // AMD
		define(['../../lib/codemirror'], mod);
	} else { // Plain browser env
		mod(CodeMirror);
	}
}(function (CodeMirror) {
	'use strict';

	var shortcodeConfig = {
		autoSelfClosers: {},
		implicitlyClosed: {},
		contextGrabbers: {},
		doNotIndent: {},
		allowUnquoted: true,
		allowMissing: true,
		caseFold: true
	};

	CodeMirror.defineMode('shortcode', function (editorConf, config_) {
		var indentUnit = editorConf.indentUnit;
		var config = {};
		var defaults = shortcodeConfig;
		for (var propDefault in defaults) config[propDefault] = defaults[propDefault];
		for (var propConfig in config_) config[propConfig] = config_[propConfig];

		// Return variables for tokenizers
		var type, setStyle;

		function inText (stream, state) {
			var ch = stream.next();
			if (ch === '[') {
				type = stream.eat('/') ? 'closeTag' : 'openTag';
				state.tokenize = inTag;
				return 'tag bracket';
			} else {
				stream.eatWhile(/[^\[]/);
				return null;
			}
		}
		inText.isInText = true;

		function inTag (stream, state) {
			var ch = stream.next();
			if (ch === ']' || (ch === '/' && stream.eat(']'))) {
				state.tokenize = inText;
				type = ch === ']' ? 'endTag' : 'selfcloseTag';
				return 'tag bracket';
			} else if (ch === '=') {
				type = 'equals';
				return null;
			} else if (ch === '[') {
				state.tokenize = inText;
				state.state = baseState;
				state.tagName = state.tagStart = null;
				var next = state.tokenize(stream, state);
				return next ? next + ' tag error' : 'tag error';
			} else if (/[\'\"]/.test(ch)) {
				state.tokenize = inAttribute(ch);
				state.stringStartCol = stream.column();
				return state.tokenize(stream, state);
			} else {
				stream.match(/^[^\s\u00a0=\[\]\"\']*[^\s\u00a0=\[\]\"\'\/]/);
				return 'word';
			}
		}

		function inAttribute (quote) {
			var closure = function (stream, state) {
				while (!stream.eol()) {
					if (stream.next() === quote) {
						state.tokenize = inTag;
						break;
					}
				}
				return 'string';
			};
			closure.isInAttribute = true;
			return closure;
		}

		function Context (state, tagName, startOfLine) {
			this.prev = state.context;
			this.tagName = tagName;
			this.indent = state.indented;
			this.startOfLine = startOfLine;
			if (config.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent)) this.noIndent = true;
		}

		function popContext (state) {
			if (state.context) state.context = state.context.prev;
		}

		function maybePopContext (state, nextTagName) {
			var parentTagName;
			while (true) {
				if (!state.context) {
					return;
				}
				parentTagName = state.context.tagName;
				if (!config.contextGrabbers.hasOwnProperty(parentTagName) ||
						!config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
					return;
				}
				popContext(state);
			}
		}

		function baseState (type, stream, state) {
			if (type === 'openTag') {
				state.tagStart = stream.column();
				return tagNameState;
			} else if (type === 'closeTag') {
				return closeTagNameState;
			} else {
				return baseState;
			}
		}

		function tagNameState (type, stream, state) {
			if (type === 'word') {
				state.tagName = stream.current();
				setStyle = 'tag';
				return attrState;
			} else {
				setStyle = 'error';
				return tagNameState;
			}
		}

		function closeTagNameState (type, stream, state) {
			if (type === 'word') {
				var tagName = stream.current();
				if (state.context && state.context.tagName !== tagName && config.implicitlyClosed.hasOwnProperty(state.context.tagName)) {
					popContext(state);
				}
				if ((state.context && state.context.tagName === tagName) || config.matchClosing === false) {
					setStyle = 'tag';
					return closeState;
				} else {
					setStyle = 'tag error';
					return closeStateErr;
				}
			} else {
				setStyle = 'error';
				return closeStateErr;
			}
		}

		function closeState (type, _stream, state) {
			if (type !== 'endTag') {
				setStyle = 'error';
				return closeState;
			}
			popContext(state);
			return baseState;
		}
		function closeStateErr (type, stream, state) {
			setStyle = 'error';
			return closeState(type, stream, state);
		}

		function attrState (type, _stream, state) {
			if (type === 'word') {
				setStyle = 'attribute';
				return attrEqState;
			} else if (type === 'endTag' || type === 'selfcloseTag') {
				var tagName = state.tagName;
				var tagStart = state.tagStart;
				state.tagName = state.tagStart = null;
				if (type === 'selfcloseTag' || config.autoSelfClosers.hasOwnProperty(tagName)) {
					maybePopContext(state, tagName);
				} else {
					maybePopContext(state, tagName);
					state.context = new Context(state, tagName, tagStart === state.indented);
				}
				return baseState;
			}
			setStyle = 'error';
			return attrState;
		}
		function attrEqState (type, stream, state) {
			if (type === 'equals') return attrValueState;
			if (!config.allowMissing) setStyle = 'error';
			return attrState(type, stream, state);
		}
		function attrValueState (type, stream, state) {
			if (type === 'string') return attrContinuedState;
			if (type === 'word' && config.allowUnquoted) {
				setStyle = 'string';
				return attrState;
			}
			setStyle = 'error';
			return attrState(type, stream, state);
		}
		function attrContinuedState (type, stream, state) {
			if (type === 'string') return attrContinuedState;
			return attrState(type, stream, state);
		}

		return {
			startState: function (baseIndent) {
				var state = {
					tokenize: inText,
					state: baseState,
					indented: baseIndent || 0,
					tagName: null,
					tagStart: null,
					context: null
				};
				if (baseIndent != null) state.baseIndent = baseIndent;
				return state;
			},

			token: function (stream, state) {
				if (!state.tagName && stream.sol()) state.indented = stream.indentation();
				if (stream.eatSpace()) return null;
				type = null;
				var style = state.tokenize(stream, state);
				if ((style || type) && style !== 'comment') {
					setStyle = null;
					state.state = state.state(type || style, stream, state);
					if (setStyle) style = setStyle === 'error' ? style + ' error' : setStyle;
				}
				return style;
			},

			indent: function (state, textAfter, fullLine) {
				var context = state.context;
				// Indent multi-line strings (e.g. css).
				if (state.tokenize.isInAttribute) {
					if (state.tagStart === state.indented) {
						return state.stringStartCol + 1;
					} else {
						return state.indented + indentUnit;
					}
				}
				if (context && context.noIndent) return CodeMirror.Pass;
				if (state.tokenize !== inTag && state.tokenize !== inText) {
					return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
				}
				// Indent the starts of attribute names.
				if (state.tagName) {
					if (config.multilineTagIndentPastTag !== false) {
						return state.tagStart + state.tagName.length + 2;
					} else {
						return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
					}
				}
				if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
				var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
				if (tagAfter && tagAfter[1]) { // Closing tag spotted
					while (context) {
						if (context.tagName === tagAfter[2]) {
							context = context.prev;
							break;
						} else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
							context = context.prev;
						} else {
							break;
						}
					}
				} else if (tagAfter) { // Opening tag spotted
					while (context) {
						var grabbers = config.contextGrabbers[context.tagName];
						if (grabbers && grabbers.hasOwnProperty(tagAfter[2])) {
							context = context.prev;
						} else {
							break;
						}
					}
				}
				while (context && context.prev && !context.startOfLine) {
					context = context.prev;
				}
				if (context) {
					return context.indent + indentUnit;
				} else {
					return state.baseIndent || 0;
				}
			},

			// configuration: 'shortcode',
			// helperType: 'shortcode',

			skipAttribute: function (state) {
				if (state.state === attrValueState) state.state = attrState;
			}
		};
	});

}));
