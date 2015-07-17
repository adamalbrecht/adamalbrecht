---
layout: post
tags: coding, reactjs, angularjs, javascript
title: How to Replace the Angular Stack with React plus a few NPM modules
---

As you can tell from the content of my blog posts, I've been practicing and preaching Angular.js for quite some time now. It is an extremely productive web framework that felt like a big step forward from my days doing jQuery "sprinkles" and then Backbone.

But then recently, I started playing with Facebook's [React](https://facebook.github.io/react/) framework. And while I'm still not quite as productive as I was with Angular, I absolutely love the code that I'm writing. And on top of that, it has opened my eyes to a whole new paradigm for creating user interfaces.

<!-- more -->

I won't make this an article comparing and contrasting the libraries (a google search will probably turn up dozens of these), but here are the main reasons I've made the switch:

  * Small API surface area - you can learn 90% of React in 1 day (unlike Angular, where [this is the common learning experience](/public/img/feelings_about_angularjs_over_time.png))
  * Due to the efficiency of the virtual DOM, you don't have to worry about updating the DOM. You just write a single `render()` function that is run over and over and applied in an efficient manner. It makes writing your views more similar to how you'd write them on the server because your view is simply a reflection of your current state. Angular's 2-way binding is nice, but it comes at a cost of speed and complexity.
  * The "Everything is a component" paradigm is an extremely pleasant and simple way to create user interfaces.
  * Everything is just javascript. Even the "templates".

And I'm sure there are others. Angular is still a great framework, but at the end of the day, I enjoy writing code in React quite a bit more.

One of the biggest differences between the two libraries is their scope (and this can be both good and bad). React only provides the view layer, while Angular provides quite a bit more, such as libraries for promises, http, dependency injection, etc, etc.

So how do we replace all these concepts in the React world? Let's go over them one by one.

## Routing

Angular has a new router that I hear is great, but all my experience had been with [UI-Router](https://github.com/angular-ui/ui-router), which I generally liked. There is a React-focused router called [react-router](https://github.com/rackt/react-router) that is really fantastic. It is highly inspired by Ember's built-in router, but uses React's JSX syntax to structure your routes.

## Promises

Promises are in most JS apps these days and ES6 (the next version of Javascript) will have built-in promises, but until then, we will need to use a library. Angular includes the very nice [$q]() library that, as of version 1.3, uses a syntax fairly similar to that of ES6. For a non-Angular project, we have a few choices. First, there is [es6-promise](https://github.com/jakearchibald/es6-promise), which is a polyfill that just includes the exact functionality that ES6 will have. But there was one feature that I missed from $q, which was the `finally()` method. So if you need this feature, I recommend the [Bluebird](https://github.com/petkaantonov/bluebird) library.

## HTTP Requests

For my early Angular projects, I used [Restangular](https://github.com/mgonto/restangular), but in later projects, I found myself just using [$http](https://docs.angularjs.org/api/ng/service/$http) with a service for each resource. [Axios](https://github.com/mzabriskie/axios) is a library that is very similar to (and, in fact, inspired by) $http. Like $http, it is promise-based, automatically transforms JSON, and allows you to setup request and response interceptors.

## Modules / Dependency Injection

Angular includes its own dependency injection framework for importing other libraries. It has a quirky syntax, but it generally works pretty well. But it is Angular-only, so it can be a bit awkward to pull in 3rd party libraries that weren't built for Angular. In React, you can just use NPM modules, which are widely supported, by using a bundling library such as [WebPack](http://webpack.github.io/) or [Browserify](http://browserify.org/) (I suggest Webpack). Then you can just require other modules like so:

{% highlight js %}
var otherLib = require('some-other-library');
{% endhighlight %}

## Unit Testing & Mocking

Easy unit testing is one of my favorite things about Angular, so it's great to know that their test runner, [Karma](http://karma-runner.github.io/0.13/index.html), isn't specific to angular and can just as easily be used with React.

Facebook actually has their own test runner and flavor of Jasmine called [Jest](https://facebook.github.io/jest/), which has two things going for it: It's easy to setup and it auto-mocks your dependencies by default. But I found it to be painfully slow and quickly switched to [Mocha](http://mochajs.org/) plus [Chai](http://chaijs.com/) and running tests using [Karma](http://karma-runner.github.io/0.13/index.html). And there are a few testing helper libraries included in React that can be used with any framework.

## Conclusion

When I first moved from server-generated "traditional" web apps (and some light backbone apps) over to Angular, it felt like a huge step forward. While moving to React may not be as big of a step in terms of productivity, it feels like a huge move forward in terms of code simplicity and cleanliness. I'm officially a convert, and I highly suggest that you check it out. And now that you know the basics of the React ecosystem, there's no excuse not to give it a try.
