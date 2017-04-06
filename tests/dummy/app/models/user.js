import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  email: attr('string'),
  username: attr('string'),
  sessionToken: attr("string")
});
