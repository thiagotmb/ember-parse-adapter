import Ember from 'ember';
import UnauthenticatedRouteMixin from 'ember-simple-auth/mixins/unauthenticated-route-mixin';

export default Ember.Route.extend(UnauthenticatedRouteMixin,{

    session: Ember.inject.service(),

    beforeModel: function() {
      debugger;
    if (this.get('session.isAuthenticated')) {
      return this.transitionTo('/user');
    }
  }
});
