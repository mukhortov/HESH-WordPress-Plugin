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
					"components/hesh.dev.js"
				],
				dest: 'lib/hesh.js'
			},
			css: {
				src: [
					'node_modules/codemirror/lib/codemirror.css',
					'node_modules/codemirror/theme/mbo.css'
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
		}

	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');

	// Default task(s).
	grunt.registerTask(
		'default', [
			'concat',
			'uglify',
			'sass'
		]
	);

};