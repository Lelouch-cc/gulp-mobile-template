const gulp = require('gulp')
const fs = require('fs-extra')
const jsYaml = require('js-yaml')
const { resolve } = require('path')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const browserSync = require('browser-sync').create()
const loadPlugins = require('gulp-load-plugins')
const $ = loadPlugins()
const isProduction = () => process.env.NODE_ENV === 'production'
const {
  devDir = 'dev',
  distDir = 'dist',
  sassConfig = {},
  base64Config = {}
} = readYamlFile(resolve(__dirname, 'config.yml'))
const destDir = () => isProduction() ? distDir : devDir

function readYamlFile (path) {
  let data = {}

  if (fs.existsSync(path)) {
    try {
      data = jsYaml.safeLoad(fs.readFileSync(path, 'utf-8'))
    } catch (err) {
      console.log(err)
    }
  }

  return data
}

function clean () {
  return fs.remove(`${destDir()}`)
}

function styles () {
  return (
    gulp
      .src(`src/scss/**/*.scss`)
      .pipe($.plumber())
      .pipe($.sass(sassConfig).on('error', err => { console.log(err) }))
      .pipe($.postcss())
      .pipe($.base64(base64Config))
      .pipe(gulp.dest(`src/css`))
      .pipe(gulp.dest(`${destDir()}/css`))
      .pipe($.if(isProduction(), $.rename({ suffix: '.min' })))
      .pipe($.if(isProduction(), $.cleanCss()))
      .pipe($.if(isProduction(), gulp.dest(`${destDir()}/css`)))
  )
}

function scripts () {
  return (
    gulp
      .src(`src/js/**/*.js`)
      .pipe($.plumber())
      .pipe($.babel())
      .pipe(gulp.dest(`${destDir()}/js`))
      .pipe($.if(isProduction(), $.rename({ suffix: '.min' })))
      .pipe($.if(isProduction(), $.uglify()))
      .pipe($.if(isProduction(), gulp.dest(`${destDir()}/js`)))
  )
}

function images () {
  return (
    gulp
      .src(`src/img/**/*.{jpg,jpeg,png,gif,svg}`)
      .pipe($.plumber())
      .pipe($.if(!isProduction(), $.changed(`${destDir()}/img`)))
      .pipe($.if(isProduction(),
        $.imagemin(
          [
            $.imagemin.gifsicle({ interlaced: true }),
            $.imagemin.jpegtran({ progressive: true }),
            $.imagemin.optipng({ optimizationLevel: 7 }),
            $.imagemin.svgo(),
            imageminMozjpeg({ quality: 70 }),
            imageminPngquant({ quality: [0.65, 0.8] })
          ], {
            verbose: false
          })))
      .pipe(gulp.dest(`${destDir()}/img`))
      .pipe($.size({ title: 'Images total size' }))
  )
}

function fonts () {
  return (
    gulp
      .src(`src/fonts/**/*`)
      .pipe($.plumber())
      .pipe($.if(!isProduction(), $.changed(`${destDir()}/fonts`)))
      .pipe(gulp.dest(`${destDir()}/fonts`))
  )
}

function html () {
  return (
    gulp
      .src(`src/*.html`)
      .pipe($.plumber())
      .pipe($.if(!isProduction(), $.changed(`${destDir()}`)))
      .pipe(gulp.dest(`${destDir()}`))
  )
}

function statics () {
  return (
    gulp
      .src(`src/static/**/*`)
      .pipe($.plumber())
      .pipe($.if(!isProduction(), $.changed(`${destDir()}/static`)))
      .pipe(gulp.dest(`${destDir()}/static`))
  )
}

function server () {
  browserSync.init({
    server: {
      baseDir: `./${devDir}`
    }
  })

  gulp.watch(`src/*.html`, html)
  gulp.watch(`src/scss/**/*.scss`, styles)
  gulp.watch(`src/js/**/*.js`, scripts)
  gulp.watch(`src/img/**/*`, images)
  gulp.watch(`src/fonts/**/*`, fonts)
  gulp.watch(`src/static/**/*`, statics)
  gulp.watch(`./src/**`)
    .on('change', browserSync.reload)
}

gulp.on('error', err => console.log('error', err))

exports.dev = async () => {
  process.env.NODE_ENV = 'development'

  await gulp.series(
    clean,
    gulp.parallel(
      styles,
      scripts,
      images,
      statics,
      fonts,
      html
    ),
    server
  )()
}

exports.build = async () => {
  process.env.NODE_ENV = 'production'

  await gulp.series(
    clean,
    gulp.parallel(
      scripts,
      styles,
      images,
      statics,
      fonts,
      html
    )
  )()
}
