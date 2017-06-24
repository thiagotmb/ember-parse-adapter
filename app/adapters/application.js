import adapter from 'ember-parse-adapter/adapters/application';
import Config from '../config/environment';

/** @module adapters/application */
export default adapter.extend({
  namespace: '',
  host: Config.APP.host,
  applicationId:  Config.APP.appId
});
