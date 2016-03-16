define(["jquery", "backbone", "underscore", "config", "leaflet"],
       function($, B, _, config, L) {
           var RouteModel = B.Model.extend({
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

                       $.get("/api/routeinfo", {route: this.id})
                           .done(function(info) {
                               info._loaded = true;
                               self.set(info);
                               promise.resolve(self);
                               if (!stops) return;

                               stops.add(_.map(info.stops,
                                               function(stop) {
                                                   stop.route_id = self.id;
                                                   return stop;
                                               }));
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
                           })
                           .fail(function(resp) {
                               console.log(resp);
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

               getActiveBounds: function() {
                   var shapes = this.getApp().shapes;

                   return shapes.where({route_id: this.id,
                                        active: true})
                       .reduce(function(bounds, shape) {
                           return bounds.extend(shape.getBounds());
                       }, L.latLngBounds([]));
               },

               getBounds: function() {
                   if (!this._bounds)
                       this._bounds = L.latLngBounds(this.get("path"));

                   return this._bounds;
               }
           });

           return RouteModel;
       });
