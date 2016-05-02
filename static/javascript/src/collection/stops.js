define(["backbone", "jquery", "stop-model", "utils", "underscore"],
       function(B, $, StopModel, $u, _) {
           var StopsCollection = B.Collection.extend({
               model: StopModel,

               initialize: function(models, options) {
                   B.Collection.prototype.initialize.apply(this, arguments);
                   this.app = options.app;
                   this.parentStopNames = {};
                   // Set when the user is zoomed in to a region:
                   this.mapArea = null;
                   this.listenTo(this, "add", this.onAdd)
                       .listenTo(this, "remove", this.onRemove);
               },

               onAdd: function(stop) {
                   var parent_id = stop.get("parent");

                   if (!parent_id) return;

                   var parent = this.get(parent_id);

                   if (!parent) {
                       var name =
                               this.parentStopNames[parent_id] ||
                               stop.get("stop_name").split("-")[0];
                       parent = new StopModel({stop_id: parent_id,
                                               lat: stop.get("lat"),
                                               lon: stop.get("lon"),
                                               is_parent: true,
                                               stop_name: name});
                       parent.children = {};
                       this.add(parent);
                   }

                   parent.addChild(stop);
               },

               onRemove: function(stop) {
                   if (stop.isParent()) {
                       this.remove(stop.getChildIds());
                   }

                   var parent = stop.getParent();
                   if (parent) {
                       parent.removeChild(stop);
                   }
               },

               addParentStopNames: function(parents) {
                   var names = this.parentStopNames;
                   _.each(parents, function(parent) {
                       names[parent.stop_id] = parent.stop_name;
                   });
               },

               addAllFromDict: function(stops) {
                   _.each(stops, _.bind(this.addFromDict, this));
               },

               addFromDict: function(stop_info) {
                   stop_info.route_ids =
                       $u.asKeys(stop_info.route_ids, true);
                   this.add(stop_info);
               },

               setMapArea: function(bounds, showRoutes) {
                   var self = this,
                       oldBounds = this.bounds;
                   this.bounds = bounds;
                   if (bounds) {
                       var route_ids = {};
                       $.getJSON("/api/rectangle",
                                 {swlat: bounds.getSouth(),
                                  swlon: bounds.getWest(),
                                  nelat: bounds.getNorth(),
                                  nelon: bounds.getEast()})
                           .done(function(result) {
                               self.addParentStopNames(result.parent_stops);
                               _.each(result.stops, function(stop_info) {
                                   self.addFromDict(stop_info);
                                   _.extend(route_ids, stop_info.route_ids);
                               });

                               if (showRoutes) {
                                   self.app.addRoutes(_.keys(route_ids));
                               }
                           });
                   } else {
                       this.cleanupStops();
                   }
               },

               inBounds: function(bounds) {
                   return this.filter(function(stop) {
                       return bounds.contains(stop.getLatLng());
                   });
               },

               inMapArea: function() {
                   if (this.bounds)
                       return this.inBounds(this.bounds);
                   else
                       return [];
               },

               /**
                * Given an array of active route_ids, find stops that should be
                * removed.
                *
                * @param {string[]} route_ids - the active route ids
                * @param {L.LatLngBounds} bounds - 
                *
                * @returns {StopModel[]}
                */
               findExcludedStops: function(route_ids) {
                   var id_map = $u.asKeys(route_ids, true),
                       bounds = this.bounds,
                       inBounds = bounds ?
                           _.bind(bounds.contains, bounds) :
                           function() { return false; };

                   return this.filter(function(stop) {
                       // Only remove stops that are not child stops, have no
                       // associated route ids in the active list, and are not
                       // in the filter bounds.
                       return !stop.getParent() &&
                           !inBounds(stop.getLatLng()) &&
                           _.every(stop.get("route_ids"),
                                   function(_t, rid) { return !id_map[rid]; });
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
