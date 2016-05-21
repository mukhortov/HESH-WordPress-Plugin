module.exports = function (grunt) {
	// TODO: Split CodeMirror into its ownfile
	// TODO: pull codepen css

	var cssGlob = 'node_modules/codemirror/theme/**/*.css';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			// codemirror: {
			//
			// },
			js: {
				src: [
					// codemirror core
					// 'node_modules/codemirror/lib/codemirror.js',

					// addons
					'node_modules/codemirror/addon/edit/matchbrackets.js',
					'node_modules/codemirror/addon/selection/active-line.js',

					// modes
					'node_modules/codemirror/mode/xml/xml.js',
					'node_modules/codemirror/mode/javascript/javascript.js',
					'node_modules/codemirror/mode/css/css.js',
					'node_modules/codemirror/mode/htmlmixed/htmlmixed.js',
					'dev/wordpresspost.js',
					'dev/shortcode.js',

					// and the wp stuff
					'.temp/CodeMirrorCSS.js',
					'dev/hesh.dev.js'
				],
				dest: '.temp/hesh.js'
			},
			css: {
				src: [
					'node_modules/codemirror/lib/codemirror.css',
					cssGlob
				],
				dest: '.temp/codemirror.scss'
			}
		},

		uglify: {
			hesh: {
				src: '.temp/hesh.js',
				dest: 'lib/hesh.min.js'
			},
			codemirror: {
				src: 'node_modules/codemirror/lib/codemirror.js',
				dest: 'lib/codemirror.min.js'
			}
		},

		sass: {
			dist: {
				options: {
					style: 'compressed' // nested, compact, compressed, expanded
				},
				files: { // 'destination':'source'
					'lib/hesh.min.css': 'dev/hesh.dev.scss',
					'lib/codemirror.min.css': '.temp/codemirror.scss'
				}
			}
			// codemirror: {
			// 	options: {
			// 		style: 'compressed'
			// 	},
			// 	files: {
			// 		'lib/codemirror.scss': '.temp/codemirror.scss'
			// 	}
			// }
		},

		filenamesToJson: {
			options: {
				fullPath: false, // true if full path should be included, default is false
				extensions: false // true if file extension should be included, default is false
			},
			files: cssGlob, // any valid glob
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
				},
				src: ['.temp/Themes.json'],
				dest: '.temp/CodeMirrorCSS.js'
			}
		},

		watch: {
			js: {
				files: ['dev/*.js'],
				tasks: ['filenamesToJson', 'json', 'concat:js', 'uglify'],
				options: {
					spawn: false
				}
			},
			css: {
				files: ['dev/*.scss'],
				tasks: ['concat:css', 'sass'],
				options: {
					spawn: false
				}
			}
		},

		devUpdate: {
			main: {
				options: {
					updateType: 'prompt'
				}
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-filenames-to-json');
	grunt.loadNpmTasks('grunt-json');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-dev-update');

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
