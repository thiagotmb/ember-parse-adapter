import Adapter from '../adapters/application';
import Serializer from '../serializers/application';
import DateTransform from '../transforms/date';
import FileTransform from '../transforms/file';
import GeopointTransform from '../transforms/geopoint';
import ParseUser from '../models/parse-user';

/**
@module initializers
@class  initialize
*/
export default function(app) {
  Adapter.reopen({
    applicationId : app.get( 'applicationId' ),
    restApiId     : app.get( 'restApiId' )
  });

  app.register( 'adapter:-parse', Adapter );
  app.register( 'serializer:-parse', Serializer );
  app.register( 'transform:parse-date', DateTransform );
  app.register( 'transform:parse-file', FileTransform );
  app.register( 'transform:parse-geo-point', GeopointTransform );
  app.register( 'model:parse-user', ParseUser );
}