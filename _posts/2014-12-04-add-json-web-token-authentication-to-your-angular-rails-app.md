---
layout: post
tags: coding, angularjs, rails, authentication, javascript
title: Authenticating your Angular / Rails App with JSON Web Tokens
---

*Note: There have been some changes in the JWT Gem that make some of the below not work exactly right (it'll still be about 90% the same). Specifically, they added expiration support.*

## Overview

I'm a big proponent of rolling your own authentication solution, especially if you're only doing simple username/password based logins (as opposed to logging in via an OAuth provider). I've tried to use [Devise](https://github.com/plataformatec/devise) on a number of Rails apps, but I always end up ripping it out. It's not because Devise is a bad gem, but because it always takes me more time to customize it to my liking than it does to just write everything myself. And the flexibilitity of a custom solution almost always comes in handy down the road. I have generally implemented it the same way that Ryan Bates does in [this Railscasts episode](http://railscasts.com/episodes/250-authentication-from-scratch-revised).

But now that most of my greenfield projects are single page javascript apps, authentication has become slightly more complicated. While you can certainly continue doing traditional authentication with cookies and server-rendered views, my preference is to use a token-based approach. This has a number of benefits:

* The same authentication API can be used by all types of clients (web app, mobile app, etc).
* It is stateless, so the web server does not have to keep track of session information, which is good for scaling.
* Protected against CSRF (cross-site request forgery) attacks
* All of your views are rendered by the client, rather than a mix of server and client rendered views.

A relatively new standard for accomplishing this is [JSON Web Tokens](http://jwt.io/) (abbreviated to JWT). I won't dig into the details because there are plenty of good resources, but JWT is a way of digitally signing data to be transferred between two parties. The data is represented as an encoded JSON object. In a nutshell, these tokens are passed to the client upon successful authentication and then subsequently used in every HTTP request in order to verify the identity of the client.

<!-- more -->

### Client/Server Data Flow

So the application flow will look something like this:

1. Client sends username and password to server.
2. If credentials are valid, the server generates a token that include's the user's ID inside the token payload. (Remember, this payload is not encrypted - the client can read it - so don't put anything you don't want the client to see)
3. The token is returned to the client, who saves it somewhere for later use.
4. When the client makes a request for protected data from the server, it includes the token in an HTTP header.
5. Upon receiving a request for protected data, the server looks at the token and verifies that it was indeed generated for the user represented by the ID in the payload.

## Server-Side Code

So let's start with the server-side code and assume you already have a basic user model. We'll first need some code to generate a JWT for a given user. So install the [jwt gem](https://github.com/progrium/ruby-jwt) into your Gemfile. Next, I found there to be fair amount of logic around the JWT auth tokens, so I extracted it into a simple `AuthToken` class that takes care of encoding and decoding the tokens for us.

{% highlight ruby %}
class AuthToken
  def self.encode(payload, exp=24.hours.from_now)
  payload[:exp] = exp.to_i
  JWT.encode(payload, Rails.application.secrets.secret_key_base)

  def self.decode(token)
    payload = JWT.decode(token, Rails.application.secrets.secret_key_base)[0]
    DecodedAuthToken.new(payload)
  rescue
    nil # It will raise an error if it is not a token that was generated with our secret key or if the user changes the contents of the payload
  end
end

# We could just return the payload as a hash, but having keys with indifferent access is always nice, plus we get an expired? method that will be useful later
class DecodedAuthToken < HashWithIndifferentAccess
  def expired?
    self[:exp] <= Time.now.to_i
  end
end
{% endhighlight ruby %}

And let's add a helper method to our `User` model that uses this class:

{% highlight ruby %}
def generate_auth_token
  payload = { user_id: self.id }
  AuthToken.encode(payload)
end
{% endhighlight ruby %}

Ok, now we need to take care of that initial authentication request in our Client/Server Data flow. The client sends a username/password combination and the server sends back a new token. So go ahead and create a new controller called `AuthController` and add a new `post` route to `routes.rb`. You may also want to return some information about the current user inside the JSON response, but for now we'll just return the auth token.

{% highlight ruby %}
class AuthController < ApplicationController
  skip_before_action :authenticate_request # this will be implemented later
  def authenticate
    user = User.find_by_credentials(params[:username], params[:password]) # you'll need to implement this
    if user
      render json: { auth_token: user.generate_auth_token }
    else
      render json: { error: 'Invalid username or password' }, status: :unauthorized
    end
  end
end

# in routes.rb:
post 'auth' => 'auth#authenticate'

{% endhighlight ruby %}

Ok, now we need to add code to validate the token on subsequent requests. What we'll do first is implement a few helper methods in our `ApplicationController` that take care of decoding/validating the token and, based on the token payload, finding the current user. Then we'll tie them all together in a a before filter/action. If the token is properly decoded and the user found, the request can be continued. If not, we'll return a `401 Unauthorized` response.

{% highlight ruby %}
class ApplicationController < ActionController::Base
  before_action :set_current_user, :authenticate_request

  rescue_from NotAuthenticatedError do
    render json: { error: 'Not Authorized' }, status: :unauthorized
  end
  rescue_from AuthenticationTimeoutError do
    render json: { error: 'Auth token is expired' }, status: 419 # unofficial timeout status code
  end

  private

  # Based on the user_id inside the token payload, find the user.
  def set_current_user
    if decoded_auth_token
      @current_user ||= User.find(decoded_auth_token[:user_id])
    end
  end

  # Check to make sure the current user was set and the token is not expired
  def authenticate_request
    if auth_token_expired?
      fail AuthenticationTimeoutError
    elsif !@current_user
      fail NotAuthenticatedError
    end
  end

  def decoded_auth_token
    @decoded_auth_token ||= AuthToken.decode(http_auth_header_content)
  end

  def auth_token_expired?
    decoded_auth_token && decoded_auth_token.expired?
  end

  # JWT's are stored in the Authorization header using this format:
  # Bearer somerandomstring.encoded-payload.anotherrandomstring
  def http_auth_header_content
    return @http_auth_header_content if defined? @http_auth_header_content
    @http_auth_header_content = begin
      if request.headers['Authorization'].present?
        request.headers['Authorization'].split(' ').last
      else
        nil
      end
    end
  end
end

{% endhighlight ruby %}

You'll also need to define the 2 errors that are being rescued from:


{% highlight ruby %}
class NotAuthenticatedError < StandardError
end
class AuthenticationTimeoutError < StandardError
end
{% endhighlight ruby %}

## Client Side Code

That should take care of the server side. Next, we'll need to add support for these API's into our angular app. To do this, we'll need to implement two pieces of code: An AuthService that will handle logging in followed by an HTTP interceptor that will automatically attach our auth token to every http request and handle auth-related error responses.

First, our AuthService. Note that there are two dependencies you'll need to implement. First, `AuthToken` is a simple service for storing the auth token in local storage while `AuthEvents` is a constant with a few auth/login related events so we're not using magic strings.

{% highlight javascript %}
app.factory("AuthService", function($http, $q, $rootScope, AuthToken, AuthEvents) {
  return {
    login: function(username, password) {
      var d = $q.defer();
      $http.post('/api/auth', {
        username: username,
        password: password
      }).success(function(resp) {
        AuthToken.set(resp.auth_token);
        $rootScope.$broadcast(AuthEvents.loginSuccess);
        d.resolve(resp.user);
      }).error(function(resp) {
        $rootScope.$broadcast(AuthEvents.loginFailed);
        d.reject(resp.error);
      });
      return d.promise;
    }
  };
});
{% endhighlight javascript %}

You'll need to implement a basic login form and controller that use this service.

Next, let's add our two http interceptors. The first is quite simple. Just attach "Bearer" followed by the auth token. This is the standard format for adding a JWT to your http headers. The error interceptor is slightly more complicatated. First, we check to make sure this isn't our intial auth request because we want that to handle errors on its own. Then, we check to see if the response code matches any of our auth-related codes. If so, we broadcast an appropriate event.

{% highlight javascript %}
app.factory("AuthInterceptor", function($q, $injector) {
  return {
    // This will be called on every outgoing http request
    request: function(config) {
      var AuthToken = $injector.get("AuthToken");
      var token = AuthToken.get();
      config.headers = config.headers || {};
      if (token) {
        config.headers.Authorization = "Bearer " + token;
      }
      return config || $q.when(config);
    },
    // This will be called on every incoming response that has en error status code
    responseError: function(response) {
      var AuthEvents = $injector.get('AuthEvents');
      var matchesAuthenticatePath = response.config && response.config.url.match(new RegExp('/api/auth'));
      if (!matchesAuthenticatePath) {
        $injector.get('$rootScope').$broadcast({
          401: AuthEvents.notAuthenticated,
          403: AuthEvents.notAuthorized,
          419: AuthEvents.sessionTimeout
        }[response.status], response);
      }
      return $q.reject(response);
    }
  };
});

app.config(function($httpProvider) {
  return $httpProvider.interceptors.push("AuthInterceptor");
});

// Elsewhere....

$rootScope.$on(AuthEvents.notAuthorized, function() {
  // ... Take some action in response to a 401
});
{% endhighlight javascript %}

How you handle these auth error events will be up to you. The simplest solution is to just redirect the user to the login page. Or you may want to pop up a modal login form so that the user doesn't lose his or her work.

Also, this naively assumes you'll have a long session length and the user won't mind logging in again at the end, even if they've been actively using it the whole time. In my app, the session timeout length is just 60 minutes. So I implemented a timer that, every x minutes, requests to reissue the token (thus pushing back the expiration date) so long as there had been recent user activity. I may share this code in a future blog post, but I figured it was out of scope for the time being.

I'd love to hear your feedback because, again, this was roughly extracted from my application and I'm not even sure it's the best implementation. So let me know on twitter, where I'm [@adam_albrecht](http://twitter.com/adam_albrecht), if you find any bugs or ways to improve the code. Thanks!
