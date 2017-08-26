'use strict';

var gulp = require('gulp');
var livereload = require('gulp-livereload');
var rename = require('gulp-rename');
// TODO: add plumber


var toJson = require('gulp-to-json');
gulp.task('build:css-json', function () {
    gulp.src('./node_modules/codemirror/theme/*.css')
        .pipe(toJson({
            filename: 'css.json',
            relative: true,
            strip: /.css/
        }))
        .pipe(gulp.dest('./.trash'));
});
var del = require('del');
gulp.task('garbage-collect', function () {
    del('./.trash/**');
});
gulp.task('clean', function () {
    del('./.trash/**');
    del('./dist/**');
});


var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var combineMq = require('gulp-combine-mq');
gulp.task('build:css', function () {
    return gulp.src('./src/*.less')
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
        codemirrorPath + 'addon/scroll/simplescrollbars.js',
        
        codemirrorPath + 'addon/fold/foldcode.js',
        codemirrorPath + 'addon/fold/foldgutter.js',
        codemirrorPath + 'addon/fold/xml-fold.js',
        // codemirrorPath + 'addon/fold/brace-fold.js', // for JS
        // codemirrorPath + 'addon/fold/comment-fold.js',
        codemirrorPath + 'addon/fold/indent-fold.js',
        
        codemirrorPath + 'addon/edit/matchbrackets.js',
        codemirrorPath + 'addon/edit/matchtags.js',
        codemirrorPath + 'addon/edit/closetag.js',
        codemirrorPath + 'addon/edit/closebrackets.js',

        // ... and finally ...
        // HESH
        './src/hesh.js'
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


gulp.task('copy:themes', ['build:css-json', 'garbage-collect']);
gulp.task('minify', ['minify:css', 'minify:js']);
gulp.task('build', ['build:css', 'build:js', 'minify']);
gulp.task('rebuild', ['clean', 'build']);
gulp.task('default', ['build', 'watch']);