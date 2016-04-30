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
                       if (config.subwayPattern.exec(route_id)) {
                           if (type == "bus")
                               return "mixed";
                           if (!type)
                               type = "subway";
                       } else {
                           if (type == "subway")
                               return "mixed";
                           if (!type)
                               type = "bus";
                       }
                   }

                   return type;
               }
           });

           return StopModel;
       });
