---
layout: post
tags: coding, ruby, rails, testing, vim, tmux
title: Run your Ruby tests quickly and easily using Vim and Tmux
---

In order for testing to become part of your development workflow, it needs to become a habit. And like any habit, its biggest enemy is neglect. Too often I'll be in a rush and not add tests to my code for a day, and that turns into a week and then a month, and suddenly I have an app where half of my codebase is untested and the other half has breaking tests. There are many things you can do to help keep this habit (hooking up a CI server immediately comes to mind), but an important one is to make running your tests as quick and easy as possible.

One way I do this is by making my ruby tests (either Rspec or Minitest) extremely easy to run while I'm using [Vim](http://www.vim.org) (and [Tmux](https://tmux.github.io)). With one quick keystroke, I can run the current test file or individual test in a new Tmux pane.

<!-- more -->

To set this up, first install the following 2 Vim plugins using a plugin manager such as [NeoBundle](https://github.com/Shougo/neobundle.vim) or [Vundle](https://github.com/VundleVim/Vundle.vim).

* [Vimux](https://github.com/benmills/vimux): Enables Vim to interact with Tmux
* [Turbux](https://github.com/jgdavey/vim-turbux): Run ruby tests from Vim

Next, you'll probably want to configure your test command to be prefixed with `bundle exec`, so add the following to your Vimrc:

{% highlight vim %}
let g:turbux_command_prefix = 'bundle exec'
{% endhighlight %}

Now that everything is installed (and you've reloaded Vim if needed), you can open your first test file. Then just hit `<leader> t` to run all of the tests. It will then open up a new tmux pane (or reuse an existing one if already open) and run them just as if you had run the command yourself. And then if you want to run a single test at a time, move the cursor to inside the test and hit `<leader> T`.

You can change these default keyboard shortcuts if you'd like. Here's what I use:

{% highlight vim %}
let g:no_turbux_mappings = 1
map <leader>t <Plug>SendTestToTmux
map <leader>s <Plug>SendFocusedTestToTmux
{% endhighlight %}

By combining these handy shortcuts with [Spring](http://guides.rubyonrails.org/4_1_release_notes.html#spring-application-preloader), the application preloader added in Rails 4.1, you'll have no excuse not to be running your tests quickly and frequently.

Here's a quick gif of how the whole process looks:

![Demo of running mintest from Vim and Tmux](/public/img/vim_tmux_testing.gif)
