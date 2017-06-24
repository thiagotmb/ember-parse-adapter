import Ember from 'ember';

export default Ember.Controller.extend({
  authManager: Ember.inject.service('session'),

  actions: {
    login() {
      this.get('authManager').authenticate('authenticator:parse-session', this.get('store'),  this.get('username'), this.get('password')).then(() => {
                }, (err) => {
                    alert("Usuário ou senha invalido!")
                });
    }
  }
});
