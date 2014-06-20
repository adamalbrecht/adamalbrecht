---

layout: post
tags: coding, angularjs, gulpjs, javascript
title: Building your Angular app with Gulp.js

---

As my work has transitioned from traditional web apps to thick-client Javascript apps (primarily using Angular), [Grunt](http://gruntjs.com) has become essential in my workflow. Grunt is a nice tool and it gets the job done. But there was always something I didn't like about it that I couldn't quite articulate until I discovered [Gulp.js](http://gulpjs.com). Whereas in Grunt, you create a json configuration file, Gulp is just a script. It's code. And it really fits my programmer brain better. In this post, I'll convert a basic Gruntfile that compiles and minifies Coffeescript into Gulp.

<!-- more -->

### The Original Gruntfile

The original Gulpfile I'm converting can be found [here](https://github.com/adamalbrecht/ngQuickDate/blob/48fb6f6db38de16d5c92bbbbe5e8e0eee2ad69b0/Gruntfile.js). It is for an angular datepicker library that I wrote called ngQuickDate. *(Side note: I'm in the middle of re-writing this library from the ground up because I no longer like the way it works)*.

I won't put the entire file inline, but here are the relevant parts that compile coffeescript files and then minifies them.

{% highlight js %}
coffee: {
  compile: {
    files: {
      "spec/build/specs.js": ["spec/*.coffee"],
      "dist/ng-quick-date.js": ["src/*.coffee"]
    }
  }
},
uglify: {
  my_target: {
    files: {
      "dist/ng-quick-date.min.js": "dist/ng-quick-date.js"
    }
  }
}
// ...
grunt.loadNpmTasks('grunt-contrib-coffee');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.registerTask('default', ['coffee', 'uglify']);
{% endhighlight %}

It's pretty straightforward, but I have 2 problems with it. First, my 2 tasks have no knowledge of one another. Coffeescript files are read, compiled, and written to disk. Then another task reads these new files in, minifies them, then writes to disk again. My second problem is that, with a configuration-based approach like this, it is very hard for a beginner to figure out how to modify tasks and add additional logic to them.

So let's first reproduce the same gruntfile in Gulp.

### Simple Gulpfile

{% highlight js %}
var gulp = require("gulp");
var concat = require("gulp-concat");
var coffee = require("gulp-coffee");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task("js", function() {
  gulp.src(["src/*.coffee"])            // Read the files
    .pipe(
      coffee({bare:true})               // Compile coffeescript
        .on("error", gutil.log)
    )
    .pipe(concat("ng-quick-date.js"))   // Combine into 1 file
    .pipe(gulp.dest("dist"))            // Write non-minified to disk
    .pipe(uglify())                     // Minify
    .pipe(rename({extname: ".min.js"})) // Rename to ng-quick-date.min.js
    .pipe(gulp.dest("dist"))            // Write minified to disk
});
gulp.task("default", function() {
  gulp.start("js");
});
{% endhighlight %}

While it's not any shorter, I find it significantly easier to read and modify without referring to documenation. As you can see, Gulp accomplishes tasks by using streams and piping, which is a great fit for reading source files, performing a number of actions on them, then writing back out to disk. Each action is chained on to the last one and this makes it unecessary to write out to temp files, thus making it quite a bit faster, as well.

### Angular Extras in Gulp

If you've used Angular for any significant period of time, you'll know that it's a bit quirky. First, minification often breaks your app due to the way its dependency injection system works. But luckily there's a fix for this: [ng-min](https://github.com/btford/ngmin). This library will analyze your source code and add the necessary arrays around function calls to make it minification friendly. For example, it will convert this:

{% highlight js %}
angular.module('whatever').controller('MyCtrl', function ($scope, $http) { ... });
{% endhighlight %}

into....

{% highlight js %}
angular.module('whatever').controller('MyCtrl', ['$scope', '$http', function ($scope, $http) { ... }]);
{% endhighlight %}

Integrating this into Grunt is easy enough, but you have to do so as an entirely separate task that runs independently of your compilation and minification. In gulp, we can add it into the middle of our chain of compilation/minification actions by adding a couple lines to our Gulpfile:

{% highlight js %}
var ngmin = require("gulp-ngmin"); // NEW
// ...
    .pipe(
      coffee({bare:true})
        .on("error", gutil.log)
    )
    .pipe(ngmin())                    // NEW: Make angular code friendly to minification
    .pipe(concat("ng-quick-date.js"))
// ...
{% endhighlight %}

Couldn't be easier. Next, let's say we're also compiling html templates from Jade but we'd like them to pre-load them into Angular's template cache so we don't have to make http requests every time. No problem!

{% highlight js %}
var ngmin = require("gulp-angular-templatecache");
// ...
gulp.src(["src/templates/*.jade"])
  .pipe(jade())            // Compile from jade to html
  .pipe(templateCache())   // Convert to JS strings and place in Angular template cache
  .pipe(gulp.dest("dist")) // Write the JS file to disk
{% endhighlight %}

But again, it's easy to add steps in between. Next, let's take care of the fact that Angular apps often produce html that is not valid html5. We can automatically add `data-` prefixes to our various angular directive attributes by using the htmlify module:

{% highlight js %}
var htmlify = require('gulp-angular-htmlify');
// ...
  .pipe(templateCache())
  .pipe(htmlify())                // Add data- prefixes to non-html5-valid attributes
  .pipe(gulp.dest("dist"))
{% endhighlight %}

As you can see, it's fairly trivial to make changes to what started as an extremely basic gulp script.

I wrote a couple angular starter templates that use gulp for compilation. One is meant for full web apps while the other is meant for creating angular libraries.

* [angular-starter-kit](https://github.com/adamalbrecht/angular-starter-kit) - Build thick-client web apps. Be aware, this is pretty opinionated and won't be for everyone.
* [angular-lib-template](https://github.com/adamalbrecht/angular-lib-template) - Build angular libraries

<hr>

### More Resources

### Documentation:

* [Gulp.js Documentation](https://github.com/gulpjs/gulp/blob/master/docs/README.md)

### Common Gulp Utilities:
* [gulp-concat](https://github.com/wearefractal/gulp-concat) - Concatenate files
* [gulp-util](https://github.com/gulpjs/gulp-util) - Various gulp utility functions
* [gulp-clean](https://github.com/peter-vilja/gulp-clean) - Clean out a folder before writing to disk
* [StreamQueue](https://github.com/nfroidure/StreamQueue) - Combine multiple streams into one while preserving the order
* [gulp-if](https://github.com/robrich/gulp-if) - Apply actions to files that meet certain conditions
* [gulp-rename](https://github.com/hparra/gulp-rename) - Rename files
* [gulp-notify](https://github.com/mikaelbr/gulp-notify) - Show native OS notifications on compilation, errors, etc
* [gulp-connect](https://github.com/avevlad/gulp-connect) - Mini web server for running your app

### Common Gulp Pre-Processors
* [gulp-coffee](https://github.com/wearefractal/gulp-coffee) - Compile coffeescript
* [gulp-ruby-sass](https://github.com/sindresorhus/gulp-ruby-sass) - Compile (the ruby version of) sass and scss
* [gulp-less](https://github.com/plus3network/gulp-less) - Compile less.css
* [gulp-jade](https://github.com/phated/gulp-jade) - Compile jade templates
* [gulp-markdown](https://github.com/sindresorhus/gulp-markdown) - Compile markdown

### Minification Plugins
* [gulp-uglify](https://github.com/terinjokes/gulp-uglify) - Minify / uglify code
* [gulp-minify-html](https://github.com/jonathanepollack/gulp-minify-html) - Minify html
* [gulp-minify-css](https://www.npmjs.org/package/gulp-minify-css) - Minify CSS
* [gulp-imagemin](https://github.com/sindresorhus/gulp-imagemin) - Compress images without losing quality

### Angular Helper Plugins
* [gulp-ngmin](https://github.com/btford/ngmin) - Make angular code friendly to minification
* [gulp-angular-htmlify](https://github.com/pgilad/gulp-angular-htmlify) - Make angular code valid html5

