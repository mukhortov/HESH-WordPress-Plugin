var gulp = require('gulp');
var livereload = require('gulp-livereload');

var less = require('gulp-less');
gulp.task('less', function () {
    return gulp.src('./src/*.less')
        .pipe(less())
        .pipe(gulp.dest('./dist'))
        .pipe(livereload());

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
        .pipe(gulp.dest('./dist'))
        .pipe(livereload());
});


gulp.task('watch', function () {
    livereload.listen();
    gulp.watch('src/**/*', ['build']);
});


gulp.task('build', ['less', 'copy:codemirror']);
gulp.task('default', ['build', 'watch']);