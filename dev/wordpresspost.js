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

	// var defaultTags = {
	// 	script: [
	// 		['lang', /(javascript|babel)/i, 'javascript'],
	// 		['type', /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^$/i, 'javascript'],
	// 		['type', /./, 'text/plain'],
	// 		[null, null, 'javascript']
	// 	],
	// 	style: [
	// 		['lang', /^css$/i, 'css'],
	// 		['type', /^(text\/)?(x-)?(stylesheet|css)$/i, 'css'],
	// 		['type', /./, 'text/plain'],
	// 		[null, null, 'css']
	// 	]
	// };

	// function maybeBackup (stream, pat, style) {
	// 	var cur = stream.current();
	// 	var close = cur.search(pat);
	// 	if (close > -1) {
	// 		stream.backUp(cur.length - close);
	// 	} else if (cur.match(/<\/?$/)) {
	// 		stream.backUp(cur.length);
	// 		if (!stream.match(pat, false)) stream.match(cur);
	// 	}
	// 	return style;
	// }

	// var attrRegexpCache = {};
	// function getAttrRegexp (attr) {
	// 	var regexp = attrRegexpCache[attr];
	// 	if (regexp) return regexp;
	// 	attrRegexpCache[attr] = new RegExp('\\s+' + attr + '\\s*=\\s*(\'|\")?([^\'\"]+)(\'|\")?\\s*');
	// 	return attrRegexpCache[attr];
	// }

	// function getAttrValue (text, attr) {
	// 	var match = text.match(getAttrRegexp(attr));
	// 	return match ? match[2] : '';
	// }

	// function getTagRegexp (tagName, anchored) {
	// 	return new RegExp((anchored ? '^' : '') + '<\/\s*' + tagName + '\s*>', 'i');
	// }

	// function addTags (from, to) {
	// 	for (var tag in from) {
	// 		var dest = to[tag] || (to[tag] = []);
	// 		var source = from[tag];
	// 		for (var i = source.length - 1; i >= 0; i--) dest.unshift(source[i]);
	// 	}
	// }

	// function findMatchingMode (tagInfo, tagText) {
	// 	for (var i = 0; i < tagInfo.length; i++) {
	// 		var spec = tagInfo[i];
	// 		if (!spec[0] || spec[1].test(getAttrValue(tagText, spec[0]))) return spec[2];
	// 	}
	// }

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

		// var tags = {};
		// var configTags = parserConfig && parserConfig.tags;
		// var configScript = parserConfig && parserConfig.scriptTypes;
		// addTags(defaultTags, tags);
		// if (configTags) addTags(configTags, tags);
		// if (configScript) {
		// 	for (var i = configScript.length - 1; i >= 0; i--) {
		// 		tags.script.unshift(['type', configScript[i].matches, configScript[i].mode]);
		// 	}
		// }

		function wordpresspost (stream, state) {
			var style = htmlmixedMode.token(stream, state.htmlState); // html stream returns the style e.g. tag, attribute, whatever
			// var tag = /\btag\b/.test(style); // if html style is tag, it sets the tag var
			// var tagName;
			// if (tag && !/[<>\s\/]/.test(stream.current()) && // if the current stream is a tag and...
			// (tagName = state.htmlState.tagName && state.htmlState.tagName.toLowerCase()) && // var set and lowercased
			// tags.hasOwnProperty(tagName)) { // teh tag is a registed html tag or <script> or <style>
			// 	state.inTag = tagName + ' '; // return the tag name and state
			// } else if (state.inTag && tag && />$/.test(stream.current())) { // if we are at the end of a tag
			// 	var inTag = /^([\S]+) (.*)/.exec(state.inTag); // set the inTag contents to a var
			// 	state.inTag = null; // set the inTag state to null
			// 	var modeSpec = stream.current() === '>' && findMatchingMode(tags[inTag[1]], inTag[2]); // is it js or css
			// 	var mode = CodeMirror.getMode(config, modeSpec); // return the appropriate mode
			// 	var endTagA = getTagRegexp(inTag[1], true); // set the anchored endtag regex
			// 	var endTag = getTagRegexp(inTag[1], false); // set the end tag regex
			// 	state.token = function (stream, state) { // reset the stream function
			// 		if (stream.match(endTagA, false)) { // divert the stream if we hit the end tag
			// 			state.token = wordpresspost; // set the token back to the regular html string
			// 			state.localState = state.localMode = null;
			// 			return null;
			// 		}
			// 		return maybeBackup(stream, endTag, state.localMode.token(stream, state.localState)); // stream the js or css
			// 	};
			// 	state.localMode = mode;
			// 	state.localState = CodeMirror.startState(mode, htmlmixedMode.indent(state.htmlState, ''));
			// } else if (state.inTag) {
			// 	state.inTag += stream.current();
			// 	if (stream.eol()) state.inTag += ' ';
			// }
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
				// if (state.localState) {
				// 	local = CodeMirror.copyState(state.localMode, state.localState);
				// }
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
				// if (!state.localMode || /^\s*<\//.test(textAfter)) {
					return htmlmixedMode.indent(state.htmlState, textAfter);
				// } else if (state.localMode.indent) {
					// return state.localMode.indent(state.localState, textAfter);
				// } else {
					// return CodeMirror.Pass;
				// }
			},

			innerMode: function (state) {
				// return {
				// 	state: state.localState || state.htmlState,
				// 	mode: state.localMode || htmlmixedMode
				// };
				return {
					state: state.htmlState,
					mode: htmlmixedMode
				};
			}
		};
	}, 'htmlmixed', 'shortcode');

	// CodeMirror.defineMIME('text/html', 'htmlmixed');
}));
