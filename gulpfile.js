var gulp = require('gulp');

var less = require('gulp-less');
gulp.task('less', function () {
    return gulp.src('./src/*.less')
        .pipe(less())
        .pipe(gulp.dest('./dist'));
});

var codemirrorPath = './node_modules/codemirror/'
gulp.task('copy:codemirror', function () {
    return gulp.src([
        codemirrorPath + 'lib/codemirror.*',
        // modes
        codemirrorPath + 'mode/xml/xml.js',
        codemirrorPath + 'mode/javascript/javascript.js',
        codemirrorPath + 'mode/css/css.js',
        codemirrorPath + 'mode/htmlmixed/htmlmixed.js',
        './src/shortcode.js',
        './src/wordpresspost.js',
        // wp stuff
        './src/hesh.js',
        codemirrorPath + 'theme/material.css',
    ])
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['less', 'copy:codemirror']);