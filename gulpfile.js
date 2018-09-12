const gulp = require('gulp')
const livereload = require('gulp-livereload')
const rename = require('gulp-rename')
const less = require('gulp-less')
const autoprefixer = require('gulp-autoprefixer')
const combineMq = require('gulp-combine-mq')
const cssnano = require('gulp-cssnano')
const concat = require('gulp-concat')
const uglify = require('gulp-uglify')
const codemirrorPath = './node_modules/codemirror/'


const moveCodeMirrorJsCore = () => {
	return gulp.src(codemirrorPath + 'lib/codemirror.js')
		.pipe(gulp.dest('./dist'))
}
const moveCodeMirrorCssCore = () => {
	return gulp.src(codemirrorPath + 'lib/codemirror.css')
		.pipe(gulp.dest('./dist'))
}

const buildCSS = () => {
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
        .pipe(rename('hesh.css'))
        .pipe(gulp.dest('./dist'))
        .pipe(livereload())
}

const minifyCSS = () => {
    return gulp.src('./dist/hesh.css')
        .pipe(cssnano())
        .pipe(rename(path => path.basename += '.min'))
        .pipe(gulp.dest('./dist'))
}

const buildJS = () => {

    return gulp.src([

        // CodeMirror Core
		// codemirrorPath + 'lib/codemirror.js', 
		// leaving this out because WP has it natively now...

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
        .pipe(rename(path => path.basename += '.min'))
        .pipe(gulp.dest('./dist'))
}

const watch = () => {
    livereload.listen()
    gulp.watch([
        './src/**/*',
        './*.php',
    ], build)
}

const moveCodeMirrorCore = gulp.series(gulp.parallel(moveCodeMirrorJsCore, moveCodeMirrorCssCore))
const minify = gulp.series(gulp.parallel(minifyCSS, minifyJS))
const build = gulp.series(gulp.parallel(buildCSS, buildJS), minify, moveCodeMirrorCore)

gulp.task('build', build)
gulp.task('default', gulp.series(build, watch))
