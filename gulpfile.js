var gulp = require('gulp');
var livereload = require('gulp-livereload');
// TODO: add plumber


var toJson = require('gulp-to-json');
gulp.task('css-json', function () {
    gulp.src('./node_modules/codemirror/theme/*.css')
        .pipe(toJson({
            filename: 'css.json',
            relative: true,
            strip: /.css/
        }))
        .pipe(gulp.dest('./.trash'));
    // del('trash/**');
});


var del = require('del');
gulp.task('clean', function () {
    del('./.trash/**');
});


var less = require('gulp-less');
gulp.task('less', function () {
    return gulp.src('./src/*.less')
        .pipe(less({
            plugins: [ require('less-plugin-glob') ]
        }))
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
    gulp.watch([
        './src/**/*',
        './*.php'
    ], ['build']);
});


gulp.task('copy:themes', ['css-json', 'clean']);
gulp.task('build', ['less', 'copy:codemirror']);
gulp.task('default', ['build', 'watch']);