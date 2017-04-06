import Ember from 'ember';
import DS from 'ember-data';

export default DS.RESTAdapter.extend({

  defaultSerializer: '-parse',

  init: function(){
    this._super();

    this.set( 'headers', {
      'X-Parse-Application-Id' : Ember.get( this, 'applicationId' )
    });

    this.set('host', Ember.get( this, 'host' ) )
    this.set('namespace', Ember.get( this, 'namespace' ) )
  },
  classesPath: 'classes',

  pathForType: function( type ) {

    if ( 'parse-user' === type ) {
      return 'users';
    } else if ( 'login' === type ) {
      return 'login';
    } else {
      return this.classesPath + '/' + this.parsePathForType( type );
    }
  },

  // Using TitleStyle is recommended by Parse
  // @TODO: test
  parsePathForType: function( type ) {
      console.log("parse path for type")
    return Ember.String.capitalize( Ember.String.camelize( type ) );
  },

  /**
  * Because Parse doesn't return a full set of properties on the
  * responses to updates, we want to perform a merge of the response
  * properties onto existing data so that the record maintains
  * latest data.
  */
  createRecord: function( store, type, record ) {

    console.log("createRecord")
    var serializer = store.serializerFor( type.modelName ),
      data       = {},
      adapter    = this;

    serializer.serializeIntoHash( data, type, record, { includeId: true } );

    return new Ember.RSVP.Promise( function( resolve, reject ) {
      adapter.ajax( adapter.buildURL( type.modelName ), 'POST', { data: data } ).then(
        function( json ) {
          var completed = Ember.merge( data, json );
          resolve( completed );
        },
        function( reason ) {
          reject( reason.responseJSON );
          }
      );
    });
  },

  /**
  * Because Parse doesn't return a full set of properties on the
  * responses to updates, we want to perform a merge of the response
  * properties onto existing data so that the record maintains
  * latest data.
  */
  updateRecord: function(store, type, record) {

    console.log("updateRecord")

    var serializer  = store.serializerFor( type.modelName ),
      id          = Ember.get(record, "id"),
      sendDeletes = false,
      deleteds    = {},
      data        = {},
      adapter     = this;

    serializer.serializeIntoHash(data, type, record);

    type.eachRelationship(function( key ) {
      if ( data[key] && data[key].deleteds ) {
        deleteds[key] = data[key].deleteds;
        delete data[key].deleteds;
        sendDeletes = true;
      }
    });

    return new Ember.RSVP.Promise( function( resolve, reject ) {
      if ( sendDeletes ) {
        adapter.ajax( adapter.buildURL( type.modelName, id ), 'PUT', { data: deleteds } ).then(
          function() {
            adapter.ajax( adapter.buildURL( type.modelName, id ), 'PUT', { data: data } ).then(
              function( updates ) {
                console.log("sendDeletes")
                console.log(data)
                console.log(updates)
                // This is the essential bit - merge response data onto existing data.
                resolve( Ember.merge( data, updates ) );
              },
              function( reason ) {
                reject( 'Failed to save parent in relation: ' + reason.response.JSON );
              }
            );
          },
          function( reason ) {
            reject( reason.responseJSON );
          }
        );

      } else {
        adapter.ajax( adapter.buildURL( type.modelName, id ), 'PUT', { data: data } ).then(
          function( json ) {
            console.log("setupIUpdate")
            console.log(json)
            // This is the essential bit - merge response data onto existing data.
            resolve( Ember.merge( data, json ) );
          },
          function( reason ) {
            reject( reason.responseJSON );
          }
        );
      }
    });
  },

  parseClassName: function (key ) {
    console.log("parseClassName")

    return Ember.String.capitalize( key );
  },


//   urlForFindHasMany(id, modelName, snapshot) {
//     return `http://www.google.com`;
// },

findHasMany: function(store, type, ids, snapshots) {
  return this.ajax( this.buildURL( type.modelName ), 'GET', { } );

},
  /**
  * Implementation of a hasMany that provides a Relation query for Parse
  * objects.
  */
  findHasMany: function( store, record, relatedInfo, url ) {
    console.log("findHasMany")

    var query = {
        where: {
          '$relatedTo': {
            'object': {
              '__type'    : 'Pointer',
              'className' : this.parseClassName( record.modelName ),
              'objectId'  : record.get( 'id' )
            },
            key: relatedInfo.key
          }
        }
    };

    // the request is to the related type and not the type for the record.
    // the query is where there is a pointer to this record.
    return this.ajax( this.buildURL( relatedInfo.type.modelName ), 'GET', { data: query } );
  },

  /**
  * Implementation of findQuery that automatically wraps query in a
  * JSON string.
  *
  * @example
  *     this.store.find('comment', {
  *       where: {
  *         post: {
  *             "__type":  "Pointer",
  *             "className": "Post",
  *             "objectId": post.get('id')
  *         }
  *       }
  *     });
  */
  query: function ( store, type, query ) {
    console.log("query")
    if ( query.where && 'string' !== Ember.typeOf( query.where ) ) {
      query.where = JSON.stringify( query.where );
    }
    // Pass to _super()
    return this._super( store, type, query );
  },

  sessionToken: Ember.computed( 'headers.X-Parse-Session-Token', function( key, value ) {
    if ( arguments.length < 2 ) {
      return this.get( 'headers.X-Parse-Session-Token' );
    } else {
      this.set( 'headers.X-Parse-Session-Token', value );
      return value;
    }
  })
});
