---

layout: post
tags: coding, angularjs, javascript
title: How to Create a Simple Modal Dialog Directive in Angular.js

---

### Modals are Easy

I've used a dozen or so modal / lightbox plugins over the years, almost exclusively jQuery-based. But you know what I didn't realize until fairly recently? Modals are easy to build yourself from scratch. So let's make one in the Angular fashion.

### The Requirements

I want to be able to create a modal with the following HTML:

{% highlight html %}
<modal-dialog show='modalShown' width='750px' height='90%'>
  <p>Modal Content Goes here<p>
</modal-dialog>
{% endhighlight %}

And I'd like it to have the following features:

* Toggle it by setting a single $scope variable to true or false (above, the variable is `modalShown`)
* Optionally specify the height and width as either a px or % value.
* Overlay the rest of the screen
* Close by either clicking an X in the corner or outside the dialog

### The Directive Code

This is a fairly simple directive, with a link function that's only a few lines long. The `show: '='` in the isolated scope sets up a 2-way binding between the variable given to the `show` attribute and the `show` variable on our scope. Setting this to true or false will toggle our modal dialog. And we check for height and width attributes and, if set, give the modal dialog an inline style. Finally, the `hideModal()` method simply sets the `show` variable to false.

{% highlight js %}
app.directive('modalDialog', function {
  return {
    restrict: 'E', // Must be a <modal-dialog> element, not an attribute or class.
    scope: {
      show: '='
    },
    replace: true, // Replace with the template below
    transclude: true, // we want to insert custom content inside the directive
    link: function(scope, element, attrs) {
      scope.dialogStyle = {};
      if (attrs.width)
        scope.dialogStyle['width'] = attrs.width;
      if (attrs.height)
        scope.dialogStyle['height'] = attrs.height;
      scope.hideModal = function() {
        scope.showOn = false;
      };
    },
    template: '...' // See below
});
{% endhighlight %}

### The Template

The template is also fairly basic. Note that the `ng-transclude` indicates where your modal content will go. And also note the use of `ng-style`, which will translate a javascript object into an inline style.

{% highlight html %}
<div class='ng-modal' ng-show='show'>
  <div class='ng-modal-overlay' ng-click='hideModal()'></div>
  <div class='ng-modal-dialog' ng-style='dialogStyle'>
    <div class='ng-modal-close' ng-click='hideModal()'>X</div>
    <div class='ng-modal-dialog-content' ng-transclude></div>
  </div>
</div>
{% endhighlight %}

### The CSS

I'm not going to spend any time going over this, but I will say that the following will only work in modern browsers (specifically the translate function). If you need <= IE9 support, you'll need center the dialog using a different method.

{% highlight css %}
.ng-modal-overlay {
  // A dark translucent div that covers the whole screen
  position:absolute;
  z-index:9999;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background-color:#000000;
  opacity: 0.8;
}
.ng-modal-dialog {
  // A centered div above the overlay with a box shadow.
  z-index:10000;
  position: absolute;
  width: 50%; // Default

  // Center the dialog
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -webkit-transform: translate(-50%, -50%);
  -moz-transform: translate(-50%, -50%);

  background-color: #fff;
  box-shadow: 4px 4px 80px #000;
}
.ng-modal-dialog-content {
  padding:10px;
  text-align: left;
}
.ng-modal-close {
  position: absolute;
  top: 3px;
  right: 5px;
  padding: 5px;
  cursor: pointer;
  font-size: 120%;
  display: inline-block;
  font-weight: bold;
  font-family: 'arial', 'sans-serif';
}
{% endhighlight %}


### Triggering the Modal

Finally, to put it all together, you'll need to add a small bit of code to your HTML and controller.

{% highlight html %}
<button ng-click='toggleModal()'>Open Modal Dialog</button>
<modal-dialog show='modalShown' width='750px' height='90%'>
  <p>Modal Content Goes here<p>
</modal-dialog>
{% endhighlight %}

{% highlight js %}
app.controller('MyCtrl', function($scope) {
  $scope.modalShown = false;
  $scope.toggleModal = function() {
    $scope.modalShown = !$scope.modalShown;
  };
});
{% endhighlight %}

And that's it! I've put a slightly more polished and configurable version of this directive up [on Github](http://github.com/adamalbrecht/ngModal).
