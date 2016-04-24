module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			dist: {
				src: [
					"components/codemirror/codemirror.js",
					"components/codemirror/css.js",
					"components/codemirror/htmlmixed.js",
					"components/codemirror/javascript.js",
					"components/codemirror/xml.js",
					"components/codemirror/active-line.js",
					"components/codemirror/matchbrackets.js",
					"components/hesh.dev.js"
				],
				dest: 'lib/hesh.js'
			}   
		},

		uglify: {
			build: {
				src: 'lib/hesh.js',
				dest: 'lib/hesh.min.js'
			}
		}

	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Default task(s).
	grunt.registerTask(
		'default', [
			'concat',
			'uglify'
		]
	);

};