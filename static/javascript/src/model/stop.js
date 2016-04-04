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
                   this.trigger("childAdded", stop);
                   this.listenTo(stop, "removed", this.removeChild);
               },

               removeChild: function(stop) {
                   delete this.children[stop.id];
                   this.stopListening(stop);
                   this.trigger("childRemoved", stop);
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

               // route_ids serves as a set of route_ids, where the routes with
               // those ids are active (selected) routes
               addRoute: function(route_id) {
                   var route_map = this.get("route_ids");
                   route_map[route_id] = true;
                   // Trigger change, if any:
                   this.set("route_ids", route_map);
               },

               addRoutes: function(route_ids) {
                   var route_map = this.get("route_ids") || {};
                   _.extend(route_map, $u.asKeys(route_ids, true));
                   this.set("route_ids", route_map);
               },

               /**
                * Removes a route from the Stop's route_id set.
                *
                * @returns {Boolean} true if the stop has no more associated
                * routes
                */
               removeRoute: function(route_id) {
                   var route_map = this.get("route_ids");
                   delete route_map[route_id];
                   this.set("route_ids", route_map);

                   return _.isEmpty(route_map);
               }
           });

           return StopModel;
       });
