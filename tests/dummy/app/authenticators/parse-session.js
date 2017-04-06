
import Ember from 'ember';
import Base from 'ember-simple-auth/authenticators/base';

export default Base.extend({
    authenticate: function (store, email, password) {

      var ParseUser  = store.modelFor('parse-user')
      var data = { username: email, password: password}

      return new Ember.RSVP.Promise(function (resolve, reject) {
        ParseUser.login( store , data ).then(
             function( user ) {
               debugger;
               Ember.run(function () {
                   resolve({ token: user.get('sessionToken') });
               });
             },
             function( error ) {
               Ember.run(function () {
                   reject(error);
               });
             }
           );
         })
    },

    restore: function (data) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          if (!Ember.isEmpty(data.token)) {
              resolve(data);
          } else {
              reject();
          }
        });
    },

    invalidate: function (data) {
        return new Ember.RSVP.Promise(function (resolve, reject) {
          if (!Ember.isEmpty(data.token)) {
              resolve(data);
          } else {
              reject();
          }
        });
    }
});
