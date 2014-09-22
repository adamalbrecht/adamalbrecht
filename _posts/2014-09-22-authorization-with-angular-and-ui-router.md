---
layout: post
tags: coding, angularjs, ui-router, authorization, javascript, coffeescript
title: Authorization in Angular.js and UI-Router
---

While working on an angular.js application recently, I found myself needing some form of authorization logic (not to be confused with authentication / login). I needed to restrict content in my app based on a user's role as well as some other factors. At first, I created a single `AuthService` service that dealt with login, authorization, and session management. But this felt messy and violated the [Single Responsibility Principle](http://en.wikipedia.org/wiki/Single_responsibility_principle), so I decided to make something cleaner. My goal was for the API to look something like this:

(Warning: lots of coffeescript ahead!)

{% highlight coffeescript %}
LoginService.login(email, password).then((u) ->
  Session.setCurrentUser(u)
)
# ... Elsewhere ....
user = Session.getCurrentUser()
authorizer = new Authorizer(user)
authorizer.canAccess(APP_PERMISSIONS.viewAdminSettings) # returns a boolean
{% endhighlight coffeescript %}

By doing it this way, I was fairly sure I could split my formerly monolithic `AuthService` into 3 separate services that had no dependencies on one another. I won't go too detailed into the login and session services because they are fairly straight forward. `LoginService` has one method that simply makes an HTTP request with a username and password and, if successful, returns the user object. `Session` is a singleton service that, given a user, can create or destroy the current session. But my solution to Authorization was fairly interesting, so I thought I'd share.

<!-- more -->

In the ruby world, I've used both [CanCan](https://github.com/CanCanCommunity/cancancan) and [Pundit](https://github.com/elabs/pundit) and so I drew a lot of inspiration from them. But at the same time, I was mindful that client-side authorization is never as complex as server side. You should never need to use client side authorization to filter data (that should be done server side), but only to show/hide pages and pieces of content.

So first, I created a constant containing a set of permissions:

{% highlight coffeescript %}
app.constant('APP_PERMISSIONS', {
  viewAdminSettings: "viewAdminSettings"
  editAdminSettings: "editAdminSettings"
  viewLibrary: "viewLibrary"
  editLibrary: "editLibrary"
  viewBusinessAssociates: "viewBusinessAssociates"
  editBusinessAssociates: "editBusinessAssociates"
  # ...
})
{% endhighlight coffeescript %}

You'll notice that the keys and values are the same. I only made this an object rather than an array so I could refer to them with a dot syntax and wouldn't have magic strings floating around.

Next, as a good programmer does, I added a test for the `Authorizer` service I was about to make.

{% highlight coffeescript %}
describe "Authorizer", ->
  Authorizer = null
  APP_PERMISSIONS = null

  beforeEach(angular.mock.module('privacypro.auth'))
  beforeEach(inject((_Authorizer_, _APP_PERMISSIONS_) ->
    Authorizer = _Authorizer_
    APP_PERMISSIONS = _APP_PERMISSIONS_
    return # always add return statements to injection blocks in Coffeescript.
  ))

  describe "canAccess()", ->
    authorizer = null
    describe "An admin user", ->
      user = { role: "admin" }
      beforeEach ->
        authorizer = new Authorizer(user)
      it "can view the admin settings", ->
        expect(authorizer.canAccess(APP_PERMISSIONS.viewAdminSettings)).toBeTruthy()

    describe "A normal user", ->
      user = { role: "normal" }
      beforeEach ->
        authorizer = new Authorizer(user)
      it "cannot view the admin settings", ->
        expect(authorizer.canAccess(APP_PERMISSIONS.viewAdminSettings)).toBeFalsy()
      it "can view the library OR view the admin settings", ->
        expect(authorizer.canAccess([APP_PERMISSIONS.viewLibrary, APP_PERMISSIONS.viewAdminSettings])).toBeTruthy()
      it "throws an error if passed a bad permission", ->
        expect(-> authorizer.canAccess("foobar")).toThrow()
{% endhighlight coffeescript %}

My specs included a number of examples and more complex scenarios, but you get the point. So next, I started work on my `Authorizer` service. This class can be as simple or complex as your authorization requirements demand. In reality, my code is quite a bit more complex than below, but you'll understand the basics from this example:


{% highlight coffeescript %}
app.service("Authorizer", (APP_PERMISSIONS, USER_ROLES) ->
  return (user) ->
    {
      canAccess: (permissions) ->
        permissions = [permissions] unless angular.isArray(permissions)
        for permission in permissions
          if !APP_PERMISSIONS[permission]?
            throw "Bad permission value"
          if user && user.role
            switch permission
              when APP_PERMISSIONS.viewAdminSettings, APP_PERMISSIONS.editAdminSettings
                return (user.role == USER_ROLES.admin)
              when APP_PERMISSIONS.editLibrary
                return (user.role == USER_ROLES.admin || user.role == USER_ROLES.normal)
              # etc...
          else
            return false
        false
    }
)
{% endhighlight coffeescript %}

Now I'm ready to add permissions to some of my routes. I always use [UI-Router](https://github.com/angular-ui/ui-router), but something similar can be done with [ngRoute](https://docs.angularjs.org/api/ngRoute/service/$route).

{% highlight coffeescript %}
$stateProvider
  .state("library", {
    url: "/library",
    templateUrl: "..."
    data: {
      permissions: [APP_PERMISSIONS.viewLibrary]
    }
  })
  .state("admin", {
    url: "/admin",
    templateUrl: "...",
    data: {
      permissions: [APP_PERMISSIONS.editAdminSettings]
    }
  })
{% endhighlight coffeescript %}

But how do I use this permission data and prevent a state from loading? To do this, you simply have to subscribe to ui-router's `$stateChangeStart` event and prevent it from propegating when necessary. Put this code inside of an angular run block.

{% highlight coffeescript %}
app.run(($rootScope, Session, Authorizer, AUTH_EVENTS) ->
  $rootScope.$on "$stateChangeStart", (event, next) ->
    permissions = if next && next.data then next.data.permissions else null
    user = Session.getCurrentUser()
    authenticator = new Authorizer(user)
    if permissions? && !authenticator.canAccess(permissions)
      event.preventDefault()
      if !user
        $rootScope.$broadcast AUTH_EVENTS.notAuthenticated
      else
        $rootScope.$broadcast AUTH_EVENTS.notAuthorized
{% endhighlight coffeescript %}

Notes:

  * `AUTH_EVENTS` is another constant where I store various auth-related events.
  * I did test this logic in my e2e tests via Protractor, but I don't want to make this post too extremely long.

Finally, I needed to restrict individual pieces of content on the page. One easy way to do this would be to create a helper method on the scope and use it in tandem with ngIf like so:

{% highlight html %}
<a href='' ng-if="canAccess('editAdminSettings')">Edit Admin Settings</a>
{% endhighlight html %}

But this is a bit messy and I hate to pollute the scope unless absolutely necessary. So instead, I created a custom directive that will work similarly:

{% highlight html %}
<a href='' ng-if-permission="editAdminSettings">Edit Admin Settings</a>
{% endhighlight html %}

I was hoping to simply extend the `ngIf` directive with a specific set of logic, but I couldn't find a way to do this (if you know how to do this, please let me know!). So instead, I simply copied [the ngIf source code](https://github.com/angular/angular.js/blob/master/src/ng/directive/ngIf.js), changed the name to `ngIfPermission`, and made a few minor enhancements to the link function:

{% highlight coffeescript %}
# the beginning is the same besides the name
link: ($scope, $element, $attr, ctrl, $transclude) ->
  block = undefined
  childScope = undefined
  previousElements = undefined

  # There is no logic in the watch, so we can use $attr.$observe instead
  $attr.$observe "ngIfPermission", (value) ->
    # Check if we can access the permission(s)
    permissions = value.split(",")
    user = Session.getCurrentUser()
    authenticator = new Authorizer(user)
    if authenticator.canAccess(permissions)
      unless childScope
        $transclude (clone, newScope) ->
          childScope = newScope
          # change the contents of the placeholder comment
          clone[clone.length++] = document.createComment(" end ngIfPermission: " + $attr.ngIfPermission + " ")

# the rest is the same
)
{% endhighlight coffeescript %}

So now we have a way to restrict access to pages as well as individual pieces of content. Remember, client side authorization is no substitute for proper server-side authorization. Anybody who is half-way decent with the Chrome dev tools can figure out how to manipulate your API requests.

I hope this helps you in your journey to create a complex and full-featured angular app. If you have any questions or have a suggestion on how to improve the code, let me know on twitter, where I'm [@adam_albrecht](http://twitter.com/adam_albrecht). Thanks!
