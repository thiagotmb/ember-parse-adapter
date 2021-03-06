import Ember from 'ember';
import RESTSerializer from 'ember-data/serializers/rest';
import DS from 'ember-data';

export default DS.RESTSerializer.extend({

  primaryKey: 'objectId',

  normalizeArrayResponse: function( store, primaryType, payload ) {
    var namespacedPayload = {};
    namespacedPayload[ Ember.String.pluralize( primaryType.modelName ) ] = payload.results;
    return this._super( store, primaryType, namespacedPayload );
  },

  normalizeSingleResponse: function( store, primaryType, payload, recordId ) {
    var namespacedPayload = {};
    namespacedPayload[ primaryType.modelName ] = payload; // this.normalize(primaryType, payload);
    return this._super( store, primaryType, namespacedPayload, recordId );
  },

  modelNameFromPayloadKey: function( key ) {
    return Ember.String.dasherize( Ember.String.singularize( key ) );
  },

  /**
  * Because Parse only returns the updatedAt/createdAt values on updates
  * we have to intercept it here to assure that the adapter knows which
  * record ID we are dealing with (using the primaryKey).
  */
  normalizeResponse: function( store, primaryModelClass, payload, id, requestType ) {
    if( id !== null && ( 'updateRecord' === requestType || 'deleteRecord' === requestType ) ) {
      payload[ this.get( 'primaryKey' ) ] = id;
    }
    return this._super( store, primaryModelClass, payload, id, requestType );
  },

  /**
  * Extracts count from the payload so that you can get the total number
  * of records in Parse if you're using skip and limit.
  */
  extractMeta: function( store, type, payload ) {
    if ( payload && payload.count ) {
      store.metadataFor( type, { count: payload.count } );
      delete payload.count;
    }
  },
  /**
  * Special handling for the Date objects inside the properties of
  * Parse responses.
  */
  extractAttributes: function( type, hash ) {
    type.eachAttribute( function( key, meta ) {
      if ( 'date' === meta.type && 'object' === Ember.typeOf( hash[key] ) && hash[key].iso ) {
        hash[key] = hash[key].iso; //new Date(hash[key].iso).toISOString();
      }
    });
    return hash
  },
  /**
  * Special handling of the Parse relation types. In certain
  * conditions there is a secondary query to retrieve the "many"
  * side of the "hasMany".
  */
  extractRelationships: function( type, hash ) {
    var store      = this.get('store'),
      serializer = this;
    type.eachRelationship( function( key, relationship ) {
      var options = relationship.options;
      if ( hash[key] && 'belongsTo' === relationship.kind ) {
          var item = hash[key]
          hash[key] = this.normalizeRelationshipObject(item,relationship, serializer, store)
      }
      // Handle the hasMany relationships
      if ( hash[key] && 'hasMany' === relationship.kind ) {
        // If this is a Relation hasMany then we need to supply
        // the links property so the adapter can async call the
        // relationship.
        // The adapter findHasMany has been overridden to make use of this.
        if ( options.relation ) {
          console.log("options.relation")
          // hash.links = {
          //       [key]: "https://googlw.com/addresses"
          // };
          hash[key] = ["ByKxawvc53", "mN5eOVNAxH"]
          // hash.relationships = {
          //       [key]: {
          //         links : {
          //           related: "/dois"
          //         }
          //       }
          // };

          // delete hash[key]
          // hash.links[key] = { self: relationship.type, related: key };
        }
        if ( options.array ) {
          console.log("options.array")
          // Parse will return [null] for empty relationships
          if ( hash[key].length && hash[key] ) {
            hash[key].forEach( function( item, index, items ) {
              // When items are pointers we just need the id
              hash[key][index] = this.normalizeRelationshipObject(item,relationship, serializer, store)
            });
          }
        }
      }

    }, this );
    return hash

  },


  normalizeRelationshipObject: function(item, relationship, serializer, store  ) {
    delete item.__type;
    delete item.className;
    item.id = item.objectId;
    delete item.objectId;
    item.type = relationship.type;

    var modelType = store.modelFor(relationship.type)
    serializer.extractAttributes( modelType, item );
    serializer.extractRelationships( modelType, item );

    var objectType = item.type
    var objectId = item.id
    var relationships = item.relationships
    delete item.type
    delete item.id
    delete item.relationships
    var relatedObject = {
      data: {
        type: objectType,
        id:   objectId,
        attributes: item,
        relationships: relationships
      }
    }

    return relatedObject
  },

  serializeIntoHash: function( hash, type, record, options ) {
    Ember.merge( hash, this.serialize( record, options ) );
  },

  serializeAttribute: function( record, json, key, attribute ) {
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
    var key       = relationship.key,
      belongsTo = record.belongsTo( key );

    if ( belongsTo ) {
      // @TODO: Perhaps this is working around a bug in Ember-Data? Why should
      // promises be returned here.
      if ( belongsTo instanceof DS.PromiseObject ) {
        if ( !belongsTo.get('isFulfilled' ) ) {
          throw new Error( 'belongsTo values *must* be fulfilled before attempting to serialize them' );
        }
        debugger;
        belongsTo = belongsTo.get( 'content' );
      }

      json[key] = {
        '__type'    : 'Pointer',
        'className' : this.parseClassName( belongsTo.modelName ),
        'objectId'  : belongsTo.id
      };
    }
  },

  parseClassName: function( key ) {
    if ( 'parseUser' === key) {
      return '_User';

    } else {
      return Ember.String.capitalize( Ember.String.camelize( key ) );
    }
  },

  serializeHasMany: function( record, json, relationship ) {
    console.log("serializeHasMany")

    var key     = relationship.key;
    var hasMany = record.hasMany(key);
    var options = relationship.options;

    if ( hasMany && hasMany.length > 0 ) {
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
          'objectId'  : child.id
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
