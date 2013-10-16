---
layout: post
title: Building a Trello-Inspired Datepicker Directive in Angular.js
---

Here we go!

Cum sociis natoque penatibus et magnis <a href="#">dis parturient montes</a>, nascetur ridiculus mus. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Sed posuere consectetur est at lobortis. Cras mattis consectetur purus sit amet fermentum.

> Curabitur blandit tempus porttitor. **Nullam quis risus eget urna mollis** ornare vel eu leo. Nullam id dolor id nibh ultricies vehicula ut id elit.

Etiam porta *sem malesuada magna* mollis euismod. Cras mattis consectetur purus sit amet fermentum. Aenean lacinia bibendum nulla sed consectetur.

{% highlight coffeescript %}
angular.module('nc-data').factory('DefaultTaskAPI', ['Restangular', '$log', (Restangular, $log) ->
  get: (id, params={}) ->
    Restangular.one('firms', params['firm_id']).one('default_tasks', id).get()

  getList: (params={}) ->
    Restangular.one('firms', params['firm_id']).getList('default_tasks')

  update: (task) ->
    task.put()

  create: (task) ->
    Restangular.one('firms', task.firm_id).all('default_tasks').post(task)

  delete: (task) ->
    task.remove()
])
{% endhighlight %}

## Heading

Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.

