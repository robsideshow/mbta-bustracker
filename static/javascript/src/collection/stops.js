define(["backbone", "stop-model", "utils", "underscore"],
       function(B, StopModel, $u, _) {
           var StopsCollection = B.Collection.extend({
               model: StopModel,

               initialize: function(options) {
                   B.Collection.prototype.initialize.apply(this, arguments);
                   this.app = options.app;
                   this.listenTo(this, "add", this.onAdd)
                       .listenTo(this, "remove", this.onRemove);
               },

               // Figure out a way to remove this?
               onAdd: function(stop) {
                   var parent_id = stop.get("parent");

                   if (!parent_id) return;

                   var parent = this.get(parent_id);

                   if (!parent) {
                       parent = new StopModel({stop_id: parent_id,
                                               lat: stop.get("lat"),
                                               lon: stop.get("lon"),
                                               is_parent: true});
                       parent.children = {};
                       this.add(parent);
                   }

                   parent.addChild(stop);
               },

               onRemove: function(stop) {
                   if (stop.isParent()) {
                       this.remove(stop.getChildIds());
                   }
               },

               /**
                * Given an array of active route_ids, find stops that should be
                * removed.
                *
                * @param {string[]} route_ids - the active route ids
                *
                * @returns {StopModel[]}
                */
               findExcludedStops: function(route_ids) {
                   var id_map = $u.asKeys(route_ids, true);

                   return this.filter(function(stop) {
                       // Only remove stops that are not child stops and have no
                       // associated route ids in the active list.
                       return !stop.getParent() &&
                           _.every(stop.get("route_ids"),
                                   function(rid) { return !id_map[rid]; });
                   });
               },
               cleanupStops: function(route_ids) {
                   if (!route_ids)
                       route_ids = this.app.route_ids;
                   return this.remove(this.findExcludedStops(route_ids));
               },

               /**
                * Find all Stops on a given route.
                */
               forRoute: function(route_id) {
                   return this.filter(function(stop) {
                       var id_map = stop.get("route_ids");
                       return id_map[route_id];
                   });
               }
           });

           return StopsCollection;
       });
