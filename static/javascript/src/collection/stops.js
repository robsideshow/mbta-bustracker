define(["backbone", "stop-model"],
       function(B, StopModel) {
           var StopsCollection = B.Collection.extend({
               model: StopModel,

               initialize: function() {
                   B.Collection.prototype.initialize.apply(this, arguments);
                   this.listenTo(this, "add", this.onAdd)
                       .listenTo(this, "remove", this.onRemove);
               },

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
