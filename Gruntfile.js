module.exports = function (grunt) {
	// TODO: pull codepen.io css

	var cssGlob = 'node_modules/codemirror/theme/**/*.css';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			js: {
				src: [
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
				dest: '.temp/codemirror.css'
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

		less: {
			dist: {
				files: {
					'.temp/hesh.css': 'dev/hesh.dev.less'
				}
			}
		},

		cssmin: {
			css: {
				files: {
					'lib/hesh.min.css': '.temp/hesh.css',
					'lib/codemirror.min.css': '.temp/codemirror.css'
				}
			}
		},

		filenamesToJson: {
			options: {
				fullPath: false,
				extensions: false
			},
			files: cssGlob,
			destination: '.temp/Themes.json'
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
				files: ['dev/*.less'],
				tasks: ['concat:css', 'less'],
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
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
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
			'less',
			'cssmin'
		]
	);

};
