define(["backbone", "leaflet", "underscore"],
       function(B, L, _) {
           var StopModel = B.Model.extend({
               idAttribute: "stop_id",

               getLatLng: function() {
                   return L.latLng(this.get("lat"), this.get("lon"));
               },

               getName: function() {
                   return this.get("stop_name");
               },

               getChildren: function() {
                   if (this.children)
                       return _.values(this.children);

                   return [];
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
                   return !!this.get("isParent");
               }
           });

           return StopModel;
       });
