define(["jquery", "backbone", "underscore", "config", "leaflet", "path-utils",
        "stop-model", "utils"],
       function($, B, _, config, L, $p, Stop, $u) {
           var RouteModel = B.Model.extend({
               initialize: function(attrs, options) {
                   B.Model.prototype.initialize.call(this, attrs, options);
               },

               getApp: function() {
                   return this.collection.app;
               },

               loadInfo: function(cacheOnly) {
                   var promise = $.Deferred();

                   if (this.get("_loaded")) {
                       promise.resolve(this);
                   } else if (cacheOnly) {
                       promise.reject("Route info not in cache.");
                   } else {
                       var self = this,
                           app = this.getApp(),
                           stops = app && app.stops,
                           shapes = app && app.shapes;

                       $.get("/api/routeinfo", {routes: this.id})
                           .done(function(routes) {
                               var info = routes.routes[self.id];
                               if (!info)
                                   return $.Deferred().reject(
                                       "Invalid route id!"
                                   );

                               info._loaded = true;

                               // Add parent stops:
                               var all_children = [];
                               stops.add(_.map(
                                   info.parent_stops,
                                   function(parent) {
                                       var child_ids = parent.children;
                                       delete parent.children;
                                       _.extend(parent, {
                                           is_parent: true
                                       });
                                       var stop = new Stop(parent),
                                           children = {};

                                       // Record the ids of stops that share a
                                       // parent stop with the current route but
                                       // are not themselves on the route.
                                       _.each(child_ids, function(id) {
                                           var stop = new Stop(
                                               {stop_id: id,
                                                route_ids: {},
                                                parent: parent.stop_id,
                                                lat: parent.lat,
                                                lon: parent.lon,
                                                stop_name: parent.stop_name});
                                           all_children.push(stop);
                                           children[id] = stop;
                                       });

                                       stop.children = children;

                                       return stop;
                                   }));
                               delete info.parent_stops;

                               stops.add(all_children);

                               _.each(info.stops,
                                      function(stop_info) {
                                          var stop = stops.add(stop_info);
                                          stop.addRoute(self.id);
                                      });

                               delete info.stops;

                               // Add shapes:
                               shapes.add(_.map(info.shape2path,
                                                function(path, id) {
                                                    return {
                                                        id: id,
                                                        path: path,
                                                        route_id: self.id
                                                    };
                                                }));
                               delete info.shape2path;

                               self.set(info);
                               promise.resolve(self);
                           })
                           .fail(function(resp) {
                               promise.reject("Invalid route");
                           });
                   }

                   return promise;
               },

               getColor: function() {
                   var style = this.get("style");

                   return style && style.color;
               },

               getName: function() {
                   return this.get("routename") || "";
               },

               isSubwayRoute: function() {
                   return !!config.subwayPattern.exec(this.id);
               },

               getActiveShapes: function() {
                   return this.getApp().shapes.where(
                       {route_id: this.id, active: true});
               },

               getActiveBounds: function() {
                   var shapes = this.getActiveShapes();
                   if (!shapes.length) return null;

                   return shapes.reduce(function(bounds, shape) {
                       return bounds.extend(shape.getBounds());
                   }, L.latLngBounds([]));
               },

               getBounds: function() {
                   if (!this._bounds)
                       this._bounds = L.latLngBounds(this.get("paths"));

                   return this._bounds;
               },

               /**
                * Calculates a non-overlapping array of paths from the active
                * shapes.
                */
               getActivePaths: function() {
                   var shapes = this.getActiveShapes(),
                       pairSet = {},
                       pairList = [];

                   _.each(shapes, function(shape) {
                       var pairs = $p.makePairs(shape.get("path"));
                       pairList = pairList.concat(
                           $p.newPairs(pairSet, pairs));
                   });

                   return $p.joinPairs(pairList, shapes[0].get("path"));
               }
           });

           return RouteModel;
       });
