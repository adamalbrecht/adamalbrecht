---
layout: post
tags: coding, angularjs, javascript, onboarding, ux
title: A Better Onboarding Experience in your Angular.js Application
---

"Onboarding" is one of those things we sometimes forget about when developing an application, but it really deserves more attention. Showing the user how to use your app can be critical in retaining them. Some people might say that if you need onboarding, your app just needs to have a better UX, but I don't think this is practical in all situations, particularly complex business applications.

For my current Angular app, I wanted a nice way to point out and explain the various features of the application right after signup. I looked through a few javascript plugins such as [Tourist.js](http://easelinc.github.io/tourist/), [Guiders.js](http://jeffpickhardt.com/guiders/), and a few others, but none seemed to work well with angular, so I decided to write my own, which I'm calling [ngOnboarding](https://github.com/adamalbrecht/ngOnboarding).

![ngOnboarding](/public/img/ng_onboarding_screenshot.png)

The library consists of a directive (`<onboarding-popover>`) that requires an array of 'steps' to be setup in your controller. Each step represents a popover element that may optionally point to an element on the screeen. Your step configuration might look something like this:

{% highlight js %}
$scope.onboardingSteps = [
  {
    title: "Welcome!",
    position: "centered",
    description: "Welcome to my app!",
    width: 300
  },
  {
    title: "Account Setup",
    position: "right",
    description: "This is the form for configuring your account.",
    attachTo: "#account_form",
    position: "bottom"
  }
];
{% endhighlight %}

Unfortunately, I had to make a design decisions that I don't particularly like, which is forcing you to reference CSS selectors in the controller. This is generally frowned upon in Angular, but I don't see a another way to support anchoring the popovers to elements on the page. If you can think of a better way to implement this, I'd love to hear it.

While it's still in development and not well-tested, it seems to work pretty well, so check it out!
