import Ember from 'ember';
import DS from 'ember-data';

export default DS.RESTSerializer.extend({

  primaryKey: 'objectId',

  // normalize:  function(modelClass, resourceHash, prop)  {
  //   console.log(prop)
  //   console.log(modelClass)
  //   console.log(resourceHash)
  //   console.log(prop)
  //   return this._super(...arguments);
  // }

//   normalizeResponse(store, primaryModelClass, payload, id, requestType) {
//     // console.log("normalizeResponse")
//     //
//     //   console.log(store)
//     //   console.log("primaryModelClass")
//     //
//       console.log(primaryModelClass)
//         console.log(primaryModelClass.modelName)
//     //
//     //   console.log("payload")
//     //
//     //   console.log(payload)
//     //   console.log("id")
//     //
//     //   console.log(id)
//     //   console.log("requestType")
//     //
//     //   console.log(requestType)
//       var modelName = primaryModelClass.modelName
//
//       console.log(modelName.toString())
//       console.log(modelName.toISOString())
//       console.log(modelName.toString)
//       console.log(modelName.toISOString)
//
//       var payload = {};
//       payload[ Ember.String.pluralize( modelName ) ] = payload.results;
//
//   return this._super(store, primaryModelClass, payload, id, requestType);
// },

  normalizeArrayResponse: function( store, primaryType, payload ) {
    console.log("extractArray")
    var namespacedPayload = {};
    namespacedPayload[ Ember.String.pluralize( primaryType.modelName ) ] = payload.results;

    return this._super( store, primaryType, namespacedPayload );
  },

  normalizeSingleResponse: function( store, primaryType, payload, recordId ) {
    console.log("extractSingle")

    var namespacedPayload = {};
    namespacedPayload[ primaryType.typeKey ] = payload; // this.normalize(primaryType, payload);

    return this._super( store, primaryType, namespacedPayload, recordId );
  },

  typeForRoot: function( key ) {
    console.log("typeForRoot")

    return Ember.String.dasherize( Ember.String.singularize( key ) );
  },

  /**
  * Because Parse only returns the updatedAt/createdAt values on updates
  * we have to intercept it here to assure that the adapter knows which
  * record ID we are dealing with (using the primaryKey).
  */
  extract: function( store, type, payload, id, requestType ) {
    console.log("extract")

    if( id !== null && ( 'updateRecord' === requestType || 'deleteRecord' === requestType ) ) {
      payload[ this.get( 'primaryKey' ) ] = id;
    }

    return this._super( store, type, payload, id, requestType );
  },

  /**
  * Extracts count from the payload so that you can get the total number
  * of records in Parse if you're using skip and limit.
  */
  extractMeta: function( store, type, payload ) {
    console.log("extractMeta")



    if ( payload && payload.count ) {
      store.metadataFor( type, { count: payload.count } );
      delete payload.count;
    }

    console.log(payload)
    console.log(payload.results)
    if (payload && payload.results) {
      payload = payload.results
    }
    console.log(payload)


  },

  /**
  * Special handling for the Date objects inside the properties of
  * Parse responses.
  */
  normalizeAttributes: function( type, hash ) {
    console.log("normalizeAttributes")

    type.eachAttribute( function( key, meta ) {
      if ( 'date' === meta.type && 'object' === Ember.typeOf( hash[key] ) && hash[key].iso ) {
        hash[key] = hash[key].iso; //new Date(hash[key].iso).toISOString();
      }
    });

    this._super( type, hash );
  },

  /**
  * Special handling of the Parse relation types. In certain
  * conditions there is a secondary query to retrieve the "many"
  * side of the "hasMany".
  */
  normalizeRelationships: function( type, hash ) {
    console.log("normalizeRelationships")

    var store      = this.get('store'),
      serializer = this;

    type.eachRelationship( function( key, relationship ) {

      var options = relationship.options;

      // Handle the belongsTo relationships
      if ( hash[key] && 'belongsTo' === relationship.kind ) {
        hash[key] = hash[key].objectId;
      }

      // Handle the hasMany relationships
      if ( hash[key] && 'hasMany' === relationship.kind ) {

        // If this is a Relation hasMany then we need to supply
        // the links property so the adapter can async call the
        // relationship.
        // The adapter findHasMany has been overridden to make use of this.
        if ( options.relation ) {
          hash.links = {};
          hash.links[key] = { type: relationship.type, key: key };
        }

        if ( options.array ) {
          // Parse will return [null] for empty relationships
          if ( hash[key].length && hash[key] ) {
            hash[key].forEach( function( item, index, items ) {
              // When items are pointers we just need the id
              // This occurs when request was made without the include query param.
              if ( 'Pointer' === item.__type ) {
                items[index] = item.objectId;

              } else {
                // When items are objects we need to clean them and add them to the store.
                // This occurs when request was made with the include query param.
                delete item.__type;
                delete item.className;
                item.id = item.objectId;
                delete item.objectId;
                item.type = relationship.type;
                serializer.normalizeAttributes( relationship.type, item );
                serializer.normalizeRelationships( relationship.type, item );
                store.push( relationship.type, item );
              }
            });
          }
        }
      }
    }, this );

    this._super( type, hash );
  },

  serializeIntoHash: function( hash, type, record, options ) {
    console.log("serializeIntoHash")

    Ember.merge( hash, this.serialize( record, options ) );
  },

  serializeAttribute: function( record, json, key, attribute ) {
    console.log("serializeAttribute")

    // These are Parse reserved properties and we won't send them.
    if ( 'createdAt' === key ||
         'updatedAt' === key ||
         'emailVerified' === key ||
         'sessionToken' === key
    ) {
      delete json[key];

    } else {
      this._super( record, json, key, attribute );
    }
  },

  serializeBelongsTo: function( record, json, relationship ) {
    console.log("serializeBelongsTo")

    var key       = relationship.key,
      belongsTo = record.get( key );

    if ( belongsTo ) {
      // @TODO: Perhaps this is working around a bug in Ember-Data? Why should
      // promises be returned here.
      if ( belongsTo instanceof DS.PromiseObject ) {
        if ( !belongsTo.get('isFulfilled' ) ) {
          throw new Error( 'belongsTo values *must* be fulfilled before attempting to serialize them' );
        }

        belongsTo = belongsTo.get( 'content' );
      }

      json[key] = {
        '__type'    : 'Pointer',
        'className' : this.parseClassName( belongsTo.constructor.typeKey ),
        'objectId'  : belongsTo.get( 'id' )
      };
    }
  },

  parseClassName: function( key ) {
    console.log("parseClassName")

    if ( 'parseUser' === key) {
      return '_User';

    } else {
      return Ember.String.capitalize( Ember.String.camelize( key ) );
    }
  },

  serializeHasMany: function( record, json, relationship ) {
    console.log("serializeHasMany")

    var key     = relationship.key,
      hasMany = record.get( key ),
      options = relationship.options;

    if ( hasMany && hasMany.get( 'length' ) > 0 ) {
      json[key] = { 'objects': [] };

      if ( options.relation ) {
        json[key].__op = 'AddRelation';
      }

      if ( options.array ) {
        json[key].__op = 'AddUnique';
      }

      hasMany.forEach( function( child ) {
        json[key].objects.push({
          '__type'    : 'Pointer',
          'className' : child.parseClassName(),
          'objectId'  : child.get( 'id' )
        });
      });

      if ( hasMany._deletedItems && hasMany._deletedItems.length ) {
        if ( options.relation ) {
          var addOperation    = json[key],
            deleteOperation = { '__op': 'RemoveRelation', 'objects': [] };

          hasMany._deletedItems.forEach( function( item ) {
            deleteOperation.objects.push({
              '__type'    : 'Pointer',
              'className' : item.type,
              'objectId'  : item.id
            });
          });

          json[key] = { '__op': 'Batch', 'ops': [addOperation, deleteOperation] };
        }

        if ( options.array ) {
          json[key].deleteds = { '__op': 'Remove', 'objects': [] };

          hasMany._deletedItems.forEach( function( item ) {
            json[key].deleteds.objects.push({
              '__type'    : 'Pointer',
              'className' : item.type,
              'objectId'  : item.id
            });
          });
        }
      }

    } else {
      json[key] = [];
    }
  }

});
