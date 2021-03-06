import gulp from 'gulp';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import less from 'gulp-less';
import inlineImages from 'less-plugin-inline-urls';
import inlineAssets from 'gulp-inline-assets';
import cleanCSS from 'gulp-clean-css';
import lessAutoprefix from 'less-plugin-autoprefix';
import uglify from 'gulp-uglify';

const paths = {
    scripts: {
        entry: 'src/popup/popup.js',
        name: 'popup.js'
    },
    styles: {
        entry: 'src/popup/css/popup.less'
    },
    html: {
        entry: 'src/popup/popup.html'
    },
    dest: 'dist/'
};

const scripts = () => {
    return browserify().transform(babelify, {
            presets: ['stage-0', 'es2015'],
            plugins: ['transform-runtime']
        })
        .require(paths.scripts.entry, {
            entry: true
        })
        .bundle()
        .pipe(source(paths.scripts.name))
        .pipe(buffer())
        .pipe(gulp.dest(paths.dest));
};

const styles = () => {
    const autoprefix = new lessAutoprefix({
        browsers: ['last 3 versions', '>1%', 'Firefox ESR']
    });

    return gulp.src(paths.styles.entry)
        .pipe(less({
            plugins: [autoprefix, inlineImages]
        }))
        .pipe(inlineAssets())
        .pipe(cleanCSS())
        .pipe(gulp.dest(paths.dest));
};

const html = () => {
    return gulp.src(paths.html.entry)
        .pipe(gulp.dest(paths.dest));
};

const uglifyJS = (done) => {
    if (process.env.NODE_ENV !== 'prod') {
        done();
        return false;
    }

    return gulp.src(paths.dest + paths.scripts.name)
        .pipe(uglify())
        .pipe(gulp.dest(paths.dest));
};

export default gulp.series(scripts, styles, html, uglifyJS);
