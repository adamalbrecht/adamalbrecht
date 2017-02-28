---
layout: post
tags: coding, reactjs, javascript, ruby, rails, flux
title: Authentication with JSON Web Tokens using Rails and React / Flux
---

In a [previous post]({% post_url 2014-12-04-add-json-web-token-authentication-to-your-angular-rails-app %}), I went over how to add authentication to your Rails + Angular app using JSON Web Tokens (JWT). This time, I'll do the same, but using the [React ecosystem]({%post_url 2015-07-17-how-to-replace-the-angular-stack-with-the-react-ecosystem %}). But even if you're using another front-end framework (Angular, Ember, Backbone), this post will be helpful because it fixes some issues with the previous server-side code that broke due to a change in the [jwt gem](https://github.com/progrium/ruby-jwt).

<!-- more -->

As I mentioned last time, I am a huge proponent of rolling your own authentication. It is not particularly complicated, plus I have found that the flexibility of a custom solution almost always comes in handy down the road and more than makes up for the up-front time-savings.

Before getting started, you should go back and read the first 2 sections (Overview and Client/Server Data Flow) of the [previous post]({% post_url 2014-12-04-add-json-web-token-authentication-to-your-angular-rails-app %}) because I'm not going to repeat this information. Also, this tutorial assumes you already have a user model that includes a username and password.

## Server Side

To get started, you'll first need to install the [jwt](https://github.com/progrium/ruby-jwt) gem.

Next, let's create a very simple abstraction for encoding and decoding auth tokens. So let's create a file at `lib/auth_token.rb` and add the following code:

{% highlight ruby %}
class AuthToken
  # Encode a hash in a json web token
  def self.encode(payload, ttl_in_minutes = 60 * 24 * 30)
    payload[:exp] = ttl_in_minutes.minutes.from_now.to_i
    JWT.encode(payload, Rails.application.secrets.secret_key_base)
  end

  # Decode a token and return the payload inside
  # If will throw an error if expired or invalid. See the docs for the JWT gem.
  def self.decode(token, leeway = nil)
    decoded = JWT.decode(token, Rails.application.secrets.secret_key_base, leeway: leeway)
    HashWithIndifferentAccess.new(decoded[0])
  end
end
{% endhighlight %}

The code is fairly straightforward. Note that the `decode` method could potentially raise on of several exceptions, so any calling code should account for this.

Next, we need to implement the endpoint used by our login form. So create a new controller called `AuthController` with a single `authenticate` action. What it will do is verify the username and password and, if correct, create a new auth token that the client can then use to make authenticated requests. We implemented the `authentication_payload` method separately because we're going to reuse it later.

{% highlight ruby %}
class AuthController < ApplicationController
  def authenticate
    # You'll need to implement the below method. It should return the
    # user instance if the username and password are valid.
    # Otherwise return nil.
    user = User.find_by_credentials(params[:username], params[:password])
    if user
      render json: authentication_payload(user)
    else
      render json: { errors: ['Invalid username or password'] }, status: :unauthorized
    end
  end

  private

  def authentication_payload(user)
    return nil unless user && user.id
    {
      auth_token: AuthToken.encode({ user_id: id }),
      user: { id: user.id, username: user.username } # return whatever user info you need
    }
  end
end
{% endhighlight %}

And add a route to your `routes.rb` file to make it accessible:

{% highlight ruby %}
post 'authenticate' => 'auth#authenticate'
{% endhighlight %}

Next, we need a way to authenticate each request and also find out who the current user is. We'll add this code to our `ApplicationController`, exposing `authenticate_request!` and `current_user` methods to the rest of our controllers.

{% highlight ruby %}
class AccessDeniedError < StandardError
end
class NotAuthenticatedError < StandardError
end
class AuthenticationTimeoutError < StandardError
end

class ApplicationController < ActionController::API
  attr_reader :current_user

  # When an error occurs, respond with the proper private method below
  rescue_from AuthenticationTimeoutError, with: :authentication_timeout
  rescue_from NotAuthenticatedError, with: :user_not_authenticated

  protected

  # This method gets the current user based on the user_id included
  # in the Authorization header (json web token).
  #
  # Call this from child controllers in a before_action or from
  # within the action method itself
  def authenticate_request!
    fail NotAuthenticatedError unless user_id_included_in_auth_token?
    @current_user = User.find(decoded_auth_token[:user_id])
  rescue JWT::ExpiredSignature
    raise AuthenticationTimeoutError
  rescue JWT::VerificationError, JWT::DecodeError
    raise NotAuthenticatedError
  end

  private

  # Authentication Related Helper Methods
  # ------------------------------------------------------------
  def user_id_included_in_auth_token?
    http_auth_token && decoded_auth_token && decoded_auth_token[:user_id]
  end

  # Decode the authorization header token and return the payload
  def decoded_auth_token
    @decoded_auth_token ||= AuthToken.decode(http_auth_token)
  end

  # Raw Authorization Header token (json web token format)
  # JWT's are stored in the Authorization header using this format:
  # Bearer somerandomstring.encoded-payload.anotherrandomstring
  def http_auth_token
    @http_auth_token ||= if request.headers['Authorization'].present?
                           request.headers['Authorization'].split(' ').last
                         end
  end

  # Helper Methods for responding to errors
  # ------------------------------------------------------------
  def authentication_timeout
    render json: { errors: ['Authentication Timeout'] }, status: 419
  end
  def forbidden_resource
    render json: { errors: ['Not Authorized To Access Resource'] }, status: :forbidden
  end
  def user_not_authenticated
    render json: { errors: ['Not Authenticated'] }, status: :unauthorized
  end
end
{% endhighlight %}

Now, for any protected method, add `authenticate_request!` to the beginning of the action method or in a before action filter.

## Client Side

Now let's switch to the client side. First, we'll create a module that wraps our authentication api request. Next, we'll need to implement a way to store our session info so that our React components can access it. And finally we'll create our login form component.

Note that this will only cover the bare minimum of what you'll probably need. Among topics that won't be covered are persisting the session to local storage (so that they can come back later and still be logged in) and renewing the session when it expires.

Also, note that I'm using ES6 (or ES2015, as some like to call it) in all of my javascript code, transpiled using [babel](http://babeljs.io). I'm a long-time Coffeescript user, but I highly recommend moving towards ES6. It brings many of Coffeescript's great features, plus the community as a whole is migrating towards it very quickly.

### Auth API Wrapper

For my react apps, I use the [axios](https://github.com/mzabriskie/axios) http library. But you can use any library you'd like. This is just a simple method that makes an HTTP Post request to the server-side endpoint we just created.

**auth_api.js:**

{% highlight js %}
import axios from 'axios';

const loginPath = '/api/authenticate';

let AuthAPI = {
  login(username, password) {
    return new Promise(function(resolve, reject) {
      axios.post(loginPath, {username: username, password: password})
        .then((resp) => resolve(resp.data))
        .catch((errResp) => reject(errResp.data));
    });
  }
};

export default AuthAPI;
{% endhighlight %}

### Session Managment using Flux

Before we implement our login form component, we need a way to maintain the state of our user session. The best way to do this is to implement the [Flux](https://facebook.github.io/flux/) pattern. If you are new to the Flux pattern, you should read up on it first, but it is essentially a circular data flow that starts with your **View**, which triggers various **Actions**, which are responded to by your **Stores** who then update the application state, to which your **View** changes accordingly. And then this process repeats for each user action.

For example, by clicking on our logout link component (the view), the logout action is triggered. Then the session store listens to this action and responds by clearing out the user and session info. Then the view, which is listening to changes on the session store, responds by hiding the logout link and showing the login link instead.

There are a number of Flux implementations out there, but I'll use [Reflux](https://github.com/spoike/refluxjs) because it is simple and contains very little boilerplate code. So install it using NPM and then create two files: `auth_actions.js` and `session_store.js`. I think there's some debate as to where data requests should originate within the flux architecture, but I'm going to go with Reflux's suggestion of putting them in the Store.

**auth_actions.js:**

{% highlight js %}
import Reflux from 'reflux';
let AuthActions = Reflux.createActions({
   // asyncResult creates 2 extra actions, one for success and one for failure
  'loginRequest': { asyncResult: true },
  'logout': { }
});
export default AuthActions;
{% endhighlight %}

**session_store.js:**

{% highlight js %}
import Reflux from 'reflux';
import AuthActions from './auth_actions';
import AuthAPI from './auth_api';

// This object is where we'll store all the session state.
// It will be a private variable and if any outside code
// wants to access it, they'll need to use one of the
// accessor methods below.
let _sessionState = {
  authRequestInProgress: false,
  authErrors: [],
  authToken: null,
  username: null,
  userId: null
};

let SessionStore = Reflux.createStore({
  // Map all the actions in AuthActions to the corresponding
  // methods below
  listenables: [AuthActions],

  // When a login request occurs, use the AuthAPI to make
  // an api request to the server and call the appropriate
  // action when it finishes.
  // Trigger a change to alert subscribers about the fact
  // that a request is in progress.
  onLoginRequest (username, password) {
    _sessionState.authRequestInProgress = true;
    AuthAPI.login(username, password)
      .then(AuthActions.loginRequest.completed)
      .catch(AuthActions.loginRequest.failed);
    this.trigger(_sessionState);
  },

  // When a login request completes successfully,
  // set the user info to the session state object and
  // trigger a change
  // an api request to the server and call the appropriate
  // action method when it finishes.
  onLoginRequestCompleted (resp) {
    _sessionState.authRequestInProgress = false;
    _sessionState.authErrors = [];
    _sessionState.authToken = resp.auth_token;
    _sessionState.username = resp.username;
    this.trigger(_sessionState);
    // You'll also need to redirect the user to the proper page,
    // but that's outside the scope of the article
  },

  // When a login request fails, set the auth errors
  // and trigger a change
  onLoginRequestFailed (resp) {
    _sessionState.authRequestInProgress = false;
    _sessionState.authErrors = resp.errors;
    this.trigger(_sessionState);
  },

  // When the user logs out, clear out the session state
  // and trigger a change
  onLogout () {
    _sessionInfo = {
      authRequestInProgress: false,
      authErrors: [],
    };
    this.trigger(_sessionState);
  },

  // Accessor Methods
  getUsername() { return _sessionState.username; }
  getUserId() { return _sessionState.userId; }
  isLoggedIn() { return (_sessionState.authToken !== null); },
  getAuthErrors() { return (_sessionState.authErrors); },
  isAuthRequestInProgress() { return (_sessionState.authRequestInProgress === true); }
});

export default SessionStore;

{% endhighlight %}


### Login Form Component

Now we need a simple login form component. Upon submission, it will trigger the **loginRequest** auth action, passing along the captured username and password.

{% highlight js %}
import React from 'react';
import AuthActions from './auth_actions.js';
import SessionStore from './session_store.js';

let LoginForm = React.createClass({
  handleLogin(e) {
    e.preventDefault();
    let username = this.refs.username.getDOMNode().value.trim();
    let password = this.refs.password.getDOMNode().value.trim();
    AuthActions.login(username, password);
  },
  renderAuthErrors() {
    let errors = SessionStore.getAuthErrors();
    if (errors.length === 0) { return null; }
    return (
      <ul className='AuthErrors'>{ errors.map((err) => ( <li>{err}</li> )) }</ul>
    );
  },
  render() {
    let buttonText = SessionStore.isAuthRequestInProgress() ? 'Submitting...' : 'Login';
    return (
      <form onSubmit={this.handleLogin}>
        { this.renderAuthErrors() }
        <input type='text' name='username' ref='username' />
        <input type='password' name='password' ref='password' />
        <button disabled={SessionStore.isAuthRequestInProgress()}>{buttonText}</button>
      </form>
    );
  }
});

export default LoginForm;

{% endhighlight %}

Now let's create a "UserControls" component that, when logged in, will show the user's username and a link to logout. Otherwise, it will show a link to the login page.

{% highlight js %}
import React from 'react';
import SessionStore from './session_store.js';
import AuthActions from './auth_actions.js';

let UserControls = React.createClass({
  handleLogout(e) {
    e.preventDefault();
    AuthActions.logout();
  },
  render() {
    if (SessionStore.isLoggedIn()) {
      return (
        <div className='UserControls'>
          <span>{SessionStore.getUsername}</span>
          <a href='#' onClick={this.handleLogout}>Logout</span>
        </div>
      );
    } else {
      return (
        <div className='UserControls'>
          <a href='#/login'>Login</a>
        </div>
      );
    }
  }
});

export default UserControls;

{% endhighlight %}

Finally, we need to configure Axios with a request "interceptor" so that it includes our auth token in the 'Authorization' header of every subsequent API request. This token is extracted and verified by our server so it knows the identity of the user. You'll want to call this code as soon as your client app is initialized.

{% highlight js %}

import SessionStore from './session_store.js';

export default function() {
  axios.interceptors.request.use(function (config) {
    config.headers.Authorization = 'Bearer ' + SessionStore.getAuthToken();
    return config;
  });
}

{% endhighlight %}

## Conclusion

As I said above, there are still some pieces missing that are outside the scope of this article, but this should at least get you started towards a nice auth experience in your Rails / React application. This code was somewhat roughly extracted from an existing codebase, so if you find any problems, let me know [on twitter](https://twitter.com/adam_albrecht). Thanks!
