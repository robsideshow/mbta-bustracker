define(["backbone", "leaflet", "underscore", "utils", "config"],
       function(B, L, _, $u, config) {
           var StopModel = B.Model.extend({
               idAttribute: "stop_id",

               defaults: function() {
                   return {
                       route_ids: {}
                   };
               },

               getLatLng: function() {
                   return L.latLng(this.get("lat"), this.get("lon"));
               },

               getName: function() {
                   return this.get("stop_name");
               },

               addChild: function(stop) {
                   if (!this.children) this.children = [];
                   this.children[stop.id] = stop;

                   _.extend(this.get("route_ids"),
                            stop.get("route_ids"));
               },

               removeChild: function(stop) {
                   delete this.children[stop.id];
               },

               getChildIds: function() {
                   return _.keys(this.children);
               },

               _stopMode: function() {
                   var type = "",
                       ids = this.get("route_ids");
                   for (var k in ids) {
                       var m = config.getRouteMode(k);
                       if (!type)
                           type = m;
                       else if (m != type)
                           return "mixed";
                   }
                   return type;
               },

               stopMode: function() {
                   if (this.isParent()) {
                       var children = this.getChildren(),
                           mode = "";
                       for (var i = 0, l = children.length; i < l; i++) {
                           var stopMode = children[i]._stopMode();
                           if (!mode)
                               mode = stopMode;
                           else if (mode != stopMode)
                               return "mixed";
                       }
                       return mode;
                   }

                   return this._stopMode();
               },

               /**
                * @param {number} id
                *
                * @returns {Boolean} true if this stop's, or one of this stop's
                * children's id is id
                */
               hasId: function(id) {
                   return this.id == id || !!this.children[id];
               },

               getChildren: function() {
                   // Returns only non-null children
                   return _.filter(this.children);
               },

               getSiblings: function() {
                   var parent = this.getParent();
                   if (parent)
                       return _.values(parent.children);

                   return [];
               },

               getParent: function() {
                   return this.collection.get(this.get("parent"));
               },

               isParent: function() {
                   return !!this.get("is_parent");
               },

               type: function() {
                   var routes = this.get("route_ids"),
                       type = "";

                   for (var route_id in routes) {
                       var mode = config.getRouteMode(route_id);
                       if (!type)
                           type = mode;
                       else if (type != mode)
                           return "mixed";
                   }

                   return type;
               }
           });

           return StopModel;
       });
