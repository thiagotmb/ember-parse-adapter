import Ember from 'ember';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

export default Ember.Route.extend(AuthenticatedRouteMixin,{
  model() {
    console.log("passeimodel")
    return this.store.findAll('user');
  },
  //
  // afterModel(model, transition) {
  //     model.get('addresses').then(function(address) {
  //       console.log(address)
  //     }).catch(function(error){
  //       console.log("errror 2")
  //       console.log(error)
  //     })
  // }
});
