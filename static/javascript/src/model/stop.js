define(["backbone", "leaflet", "underscore", "utils"],
       function(B, L, _, $u) {
           /**
            *
            */
           var StopModel = B.Model.extend({
               idAttribute: "stop_id",

               defaults: {
                   route_ids: {}
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
               },

               removeChild: function(stop) {
                   delete this.children[stop.id];
               },

               getChildIds: function() {
                   return _.keys(this.children);
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
               }
           });

           return StopModel;
       });
