const gulp = require('gulp')
const livereload = require('gulp-livereload')
const rename = require('gulp-rename')
const less = require('gulp-less')
const autoprefixer = require('gulp-autoprefixer')
const combineMq = require('gulp-combine-mq')
const cssnano = require('gulp-cssnano')
const concat = require('gulp-concat')
const uglify = require('gulp-uglify')
const cssbeautify = require('gulp-cssbeautify')

const compileCSS = () => {
    return gulp.src('./src/hesh.dev.less')
        .pipe(less({
            plugins: [ require('less-plugin-glob') ]
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            flexbox: 'no-2009'
            // cascade: false
        }))
        .pipe(combineMq({
            beautify: true
		}))
		// .pipe(cssnano({
		// 	discardComments: false
		// }))
		.pipe(cssbeautify({
            indent: '  ',
            autosemicolon: true
        }))
        .pipe(rename('hesh.css'))
        .pipe(gulp.dest('./dist'))
        .pipe(livereload())
}

const minifyCSS = () => {
    return gulp.src('./dist/hesh.css')
		.pipe(cssnano())
		// we beautify afterward so the file is editable in the WP Plugin Editor
		.pipe(cssbeautify({
            indent: '  ',
            autosemicolon: true
        }))
        // .pipe(rename(path => path.basename += '.min'))
        .pipe(gulp.dest('./dist'))
}

const compileJS = () => {
    const codemirrorPath = './node_modules/codemirror/'

    return gulp.src([

        // CodeMirror Core
        codemirrorPath + 'lib/codemirror.js',

        // Modes
        codemirrorPath + 'mode/xml/xml.js',
        codemirrorPath + 'mode/javascript/javascript.js',
        codemirrorPath + 'mode/css/css.js',
        codemirrorPath + 'mode/htmlmixed/htmlmixed.js',
        codemirrorPath + 'mode/clike/clike.js',
        codemirrorPath + 'mode/php/php.js',
        './src/shortcode.js',
        './src/wordpresspost.js',

        // AddOns
        codemirrorPath + 'addon/selection/active-line.js',
        codemirrorPath + 'addon/search/searchcursor.js',
        codemirrorPath + 'addon/search/search.js',
        codemirrorPath + 'addon/dialog/dialog.js',
        codemirrorPath + 'addon/scroll/simplescrollbars.js',
        codemirrorPath + 'addon/comment/comment.js',

        codemirrorPath + 'addon/fold/foldcode.js',
        codemirrorPath + 'addon/fold/foldgutter.js',
        codemirrorPath + 'addon/fold/xml-fold.js',
        // codemirrorPath + 'addon/fold/brace-fold.js', // for JS
        // codemirrorPath + 'addon/fold/comment-fold.js',
        codemirrorPath + 'addon/fold/indent-fold.js',

        codemirrorPath + 'addon/edit/matchbrackets.js',
        codemirrorPath + 'addon/edit/matchtags.js',
        codemirrorPath + 'addon/search/match-highlighter.js',
        codemirrorPath + 'addon/edit/closetag.js',
        codemirrorPath + 'addon/edit/closebrackets.js',

        codemirrorPath + 'keymap/sublime.js',
        codemirrorPath + 'keymap/emacs.js',
        codemirrorPath + 'keymap/vim.js',

        // ... and finally ...
        // HESH
        './src/hesh.dev.js',
    ])
        .pipe(concat('hesh.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(livereload())
}

const minifyJS = () => {
    return gulp.src('./dist/hesh.js')
        .pipe(uglify())
        // .pipe(rename(path => path.basename += '.min'))
        .pipe(gulp.dest('./dist'))
}

const watch = () => {
    livereload.listen()
    gulp.watch([
        './*.php',
	])
	gulp.watch([
        './src/**/*.css',
        './src/**/*.less',
	], compileCSS)
	gulp.watch([
        './src/**/*.js',
        './*.php',
    ], compileJS)
}

const compile = gulp.parallel(compileCSS, compileJS)
const minify = gulp.parallel(minifyCSS, minifyJS)
const build = gulp.series(compile, minify)
const dev = gulp.series(compile, watch)

gulp.task('compile', compile)
gulp.task('build', build)
gulp.task('dev', dev)
gulp.task('default', dev)
