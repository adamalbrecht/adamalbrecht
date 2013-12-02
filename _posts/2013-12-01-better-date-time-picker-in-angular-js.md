---
layout: post
tags: coding, angularjs, javascript
title: A Better Date Picker in Angular.js
---

I wasn't particularly happy with any of the datepicker directives out there for Angular.js, so I decided to build one myself. I did it out of a need on my current project but also because I wanted to learn the ins and outs of directives. You can find the library [on Github](https://github.com/adamalbrecht/ngQuickDate).

### Requirements:

* Easy to use via the keyboard. I hate when I'm using a form-centric application and there's one particular field that I can't just tab through.

* No dependencies (besides angular). Many of the existing datepicker directives are just jQuery widgets that are made to work with Angular. I wanted to build something from scrath in the "angular way".

* Very configurable. If it's not totally required, make it optional.

* Lightweight styling that can be easily overridden. Too many front-end libraries assume you're using bootstrap or a particular icon font. I actually am using bootstrap for my project, but I don't want it to be forced on anyone.

### The End Result:

After a few hours hacking here and there for a couple weeks, I have something fairly stable that I'm calling [ngQuickDate](https://github.com/adamalbrecht/ngQuickDate). It is built with Coffeescript, meets all my requirements, is fairly well tested using [jasmine](http://pivotal.github.io/jasmine/), and works pretty damn well if you ask me. Unfortunately, there were quite a few breaking changes in the recent 1.2 release of Angular, so currently it only works with 1.0.8. I'll be releasing a 1.2 compatible version shortly.

### Lessons Learned:

If you really want to understand the amazing directive system in Angular, building a datepicker or another similarly-complex UI widget is a great way to go about it. I had to go through a number of iterations before it felt right, but I learned a lot in the process. A few things to keep in mind:

* Learn what's already built into angular before you pull in any 3rd-party libraries. For example, I didn't realize at first that I could use filters in my javascript code (as opposed to just in templates), so I was using another library to format dates.

* Take the time to provide some decent configuration for your directive. Angular provides a nice way to set the original default settings using a ['provider'](http://docs.angularjs.org/api/AUTO.$provide#methods_provider).

* Make 3rd-party libraries optional by providing basic functionality without them, and extended functionality with them. In ngQuickDate, you can configure it to work with a library like [Sugar.js](http://sugarjs.com) for enhanced date parsing, but it's not required.

* Use [SMACSS](http://smacss.com/) or a similarly modular system for writing your directive's CSS. By doing this, you're much less likely to use conflicting class names, you'll write more efficient CSS, and make it easier to re-style.

* Stick to the tools you know and love if it will help your project. I started out with the intention of doing it in plain Javascript and CSS so I wouldn't turn off any developers out there unfamiliar with Coffeescript or any of the CSS pre-processors. But writing Coffeescript is just so much more fun the end-result is much more succinct and readable.
