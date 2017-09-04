'use strict';

var gulp = require('gulp');
var livereload = require('gulp-livereload');
var rename = require('gulp-rename');

var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var combineMq = require('gulp-combine-mq');
gulp.task('build:css', function () {
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
        .pipe(livereload());
});
var cssnano = require('gulp-cssnano');
gulp.task('minify:css', function () {
    return gulp.src('./dist/hesh.css')
        .pipe(cssnano())
        .pipe(rename(function (path) { path.basename += '.min'; }))
        .pipe(gulp.dest('./dist'));
});



var codemirrorPath = './node_modules/codemirror/';
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
gulp.task('build:js', function () {
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
        './src/hesh.dev.js'
    ])
        .pipe(concat('hesh.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(livereload());
});
gulp.task('minify:js', function () {
    return gulp.src('./dist/hesh.js')
        .pipe(uglify())
        .pipe(rename(function (path) { path.basename += '.min'; }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
    livereload.listen();
    gulp.watch([
        './src/**/*',
        './*.php'
    ], ['build']);
});


gulp.task('minify', ['minify:css', 'minify:js']);
gulp.task('build', ['build:css', 'build:js', 'minify']);
gulp.task('rebuild', ['clean', 'build']);
gulp.task('default', ['build', 'watch']);