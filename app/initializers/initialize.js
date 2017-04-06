import initializer from 'ember-parse/initializers/initialize';

export default {
  name: 'ember-parse-adapter',

  after: 'ember-data',

  initialize: initializer
};
