import initializer from 'ember-parse/initializers/initialize';

export default {
  name: 'ember-parse',

  after: 'ember-data',

  initialize: initializer
};
