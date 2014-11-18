---
layout: post
tags: coding, angularjs, javascript
title: How to Auto-Save your model in Angular.js using $watch and a Debounce function.
---

### The Problem

Currently, I'm working on an Angular app that is very form-centric. Fields and fields and more fields. I want to make the form-filling process as quick and painless as possible, so I'm trying to implement auto-save.

<!-- more -->

------

### Update (March 19th, 2014)

I've done quite a bit more auto-saving on my current project and I've updated my post with some slightly better methods. It also now has a solution for when you are trying to auto-save multiple items in an array. I combined a lot of the info below into [this live example](http://jsbin.com/xohugepe/1/edit?html,js,output).

------

### First Attempt

My first attempt at an auto-save solution (while still being very new to Angular) was a directive that, based on the type of element, waited for either a `change` or `blur` event to occur and communicated to the controller (via a service) that it was time to save the model.

{% highlight html %}
<input type='text' ng-model='myModel.field1' auto-save />
<select ng-model='myModel.field2' auto-save >...</select>
{% endhighlight %}

A simpler version of this method might look something like this:

{% highlight html %}
<input type='text' ng-model='myModel.field1' ng-blur='save()' />
<select ng-model='myModel.field2' ng-change='save()' >...</select> 
{% endhighlight %}

There are a few problems with this method:

1. I have to add these extra attributes to each and every input field. If I happen to forget one, my user may lose their data since there aren't any explicit 'Save' buttons.
2. It won't auto-save until the user changes the focus of the field. This is particularly problematic with `<textarea>` fields, where the user may type for long periods of time before changing focus.
3. I'd much rather my view not know anything about when my model is or isn't being saved to the server.

### New Solution: $watch and debounce

My new solution uses the `$watch` method that Angular provides for watching for changes to scope variables. I don't want to make requests to the server with every keystroke, so I'll use a simple debounce function (using Angular's `$timeout` service) to limit my requests to happening every few seconds.

To implement this solution, there is nothing to add to your view. But in the controller, you'll need to inject `$timeout` and write a couple `$watch` statement. I added a watch statement for each individual attribute of the model, but you could also do a deep watch of the entire model. This is slightly more expensive performance-wise.

{% highlight html %}
<input type='text' ng-model='myModel.field1' />
<select ng-model='myModel.field2'>...</select> 
{% endhighlight %}

{% highlight js %}
app.controller('myCtrl', function($scope, $timeout) {
  $scope.myModel = {};
  var timeout = null;
  var saveUpdates = function() {
    // .... save data to server
  };
  var debounceSaveUpdates = function(newVal, oldVal) {
    if (newVal != oldVal) {
      if (timeout) {
        $timeout.cancel(timeout)
      }
      timeout = $timeout(saveUpdates, 1000);  // 1000 = 1 second
    }
  };
  $scope.$watch('myModel.field1', debounceSaveUpdates)
  $scope.$watch('myModel.field2', debounceSaveUpdates)
});
{% endhighlight %}


### Potential Gotcha #1: Validation

Angular.js doesn't provide any sort of model validation (or any model-related code at all) and instead recommends that you validate the form using a combination of HTML5 validation and a few built in directives. Angular includes a way to access our form and its `$valid` attribute. First, we need to wrap our fields in a `<form>` tag with a `name` attribute and also make our fields required.

{% highlight html %}
<form name='myForm'>
  <input type='text' ng-model='myModel.field1' required />
  <select ng-model='myModel.field2' required>...</select> 
</form>
{% endhighlight %}

Next, we need to update our controller a bit to check the validity of our form.

{% highlight js %}

var saveUpdates = function() {
  if ($scope.myForm.$valid) {
    // .... save data to server
  }
};
{% endhighlight %}

If you need more complex validators, you'll need to create custom directives that make use of the [$setValidity](http://docs.angularjs.org/api/ng.directive:ngModel.NgModelController#methods_$setvalidity) method.

### Potential Gotcha #2: Preventing Double-Saves on Create

One problem I ran into was that when I auto-saved a brand new object was that the object was replaced with the version from the server, causing the `$watch` function to be triggered again. The result was that my object was immediately saved a second time, unnecessarily. The solution to this is fairly simple: just set a `saveInProgress` flag so that it never starts another save before the previous one finishes. This will also prevent a double-save caused by a save call that is slower than the timeout on your debounce function. It might look something like this:

{% highlight js %}
var saveInProgress = false;
var saveFinished = function() { saveInProgress = false; };
var saveUpdates = function() {
  if ($scope.myForm.$valid) {
    saveInProgress = true;
    saveFunction().finally(saveFinished); // The finally method runs regarless of whether the save was successful or not.
  }
};
{% endhighlight %}

A related and much harder problem is how to resolve changes to the model that happen during the round-trip of the save. I recently [had a discussion on Twitter about this](https://twitter.com/realtarnschaf/status/407489612227940352), but I think it really comes down to designing your UX to discourage or prevent your user from making changes to the model while still waiting on that first `POST` creation request. If you also replace your model with the server's version on subsequent updates (which is generally not recommended), the problem gets a little trickier.

### Potential Gotcha #3: Auto-Saving individual items in an array

Another issue that you'll often run into is when you have an array of objects, perhaps in a grid interface. While angular does provide a `$watchCollection` method, it only does a shallow watch on the array as a whole and won't tell you which item was changed.

Instead, a better solution is to wrap the fields of each individual item inside a child controller or directive. [Here is a live example of how that would work.](http://jsbin.com/xohugepe/1/edit?html,js,output)

And that's it! This is an extremely simple example, so if you have any questions or comments, give me a shout out [on Twitter](http://twitter.com/adam_albrecht).
