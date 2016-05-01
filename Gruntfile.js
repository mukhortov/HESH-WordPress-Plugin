module.exports = function (grunt) {

	var cssGulp = 'node_modules/codemirror/theme/**/*.css';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			js: {
				src: [
					// codemirror core
					'node_modules/codemirror/lib/codemirror.js',

					// addons
					'node_modules/codemirror/addon/edit/matchbrackets.js',
					'node_modules/codemirror/addon/selection/active-line.js',
					// 'node_modules/codemirror/addon/mode/simple.js',

					// modes
					'node_modules/codemirror/mode/xml/xml.js',
					'node_modules/codemirror/mode/javascript/javascript.js',
					'node_modules/codemirror/mode/css/css.js',
					'node_modules/codemirror/mode/htmlmixed/htmlmixed.js',
					'dev/wordpresspost.js',
					'dev/shortcode.js',

					// and the wp stuff
					'.temp/CodeMirrorCSS.js',
					// 'dev/simplemode.js',
					'dev/hesh.dev.js'
				],
				dest: 'lib/hesh.js'
			},
			css: {
				src: [
					'node_modules/codemirror/lib/codemirror.css',
					cssGulp
				],
				dest: '.temp/codemirror.scss'
			}
		},

		uglify: {
			build: {
				src: 'lib/hesh.js',
				dest: 'lib/hesh.min.js'
			}
		},

		sass: {
		dist: {
			options: {
				style: 'expanded' // nested, compact, compressed, expanded
			},
			files: {
				'lib/hesh.min.css': 'dev/hesh.dev.scss' // syntax is - 'destination':'source'
			}
		}
		},

		filenamesToJson: {
			options: {
				fullPath: false, // true if full path should be included, default is false
				extensions: false // true if file extension should be included, default is false
			},
			files: cssGulp, // any valid glob
			destination: '.temp/Themes.json' // path to write json to
		},

		json: {
			CodeMirrorThemes: {
				options: {
					namespace: 'CodeMirrorCSS',
					pretty: true,
					processName: function (filename) {
						return filename;
					}
					// processContent: function(content) {
					// 	content.myVar = 'myVal';
					// 	return content;
					// }
				},
				src: ['.temp/Themes.json'],
				dest: '.temp/CodeMirrorCSS.js'
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-filenames-to-json');
	grunt.loadNpmTasks('grunt-json');

	grunt.registerTask(
		'default', [
			'filenamesToJson',
			'json',
			'concat',
			'uglify',
			'sass'
		]
	);

};
