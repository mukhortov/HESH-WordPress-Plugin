module.exports = function(grunt) {

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
					// modes
					'node_modules/codemirror/mode/xml/xml.js',
					'node_modules/codemirror/mode/javascript/javascript.js',
					'node_modules/codemirror/mode/css/css.js',
					'node_modules/codemirror/mode/htmlmixed/htmlmixed.js',
					// and the wp stuff
					"lib/CodeMirrorThemes.js",
					"components/hesh.dev.js"
				],
				dest: 'lib/hesh.js'
			},
			css: {
				src: [
					'node_modules/codemirror/lib/codemirror.css',
					'node_modules/codemirror/theme/**/*.css'
				],
				dest: 'lib/codemirror.scss'
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
		      // cssmin will minify later
		      style: 'expanded' // nested, compact, compressed, expanded
		    },
		    files: {
		      'lib/hesh.min.css': 'components/hesh.dev.scss'
		      // syntax is - 'destination':'source',
		    }
		  }
		},

	    filenamesToJson : {
	    	options : {
	    		fullPath : false, // true if full path should be included, default is false
	    		extensions : false // true if file extension should be included, default is false 
	    	},
	        files : 'node_modules/codemirror/theme/**/*.css', // any valid glob
	        destination : 'lib/CodeMirrorThemes.json' // path to write json to
	    },

		json: {
		    CodeMirrorThemes: {
		        options: {
		            namespace: 'CodeMirrorThemes',
		            pretty: true,
		            processName: function(filename) {
		                return filename;
		            },
					// processContent: function(content) {
					// 	content.myVar = 'myVal';
					// 	return content;
					// }
		        },
		        src: ['lib/CodeMirrorThemes.json'],
		        dest: 'lib/CodeMirrorThemes.js'
		    }
		}

	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-filenames-to-json');
	grunt.loadNpmTasks('grunt-json');


	// Default task(s).
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