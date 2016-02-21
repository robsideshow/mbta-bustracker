/**
 * 
 */
define(["jquery", "leaflet", "config", "stop-marker"],
       function($, L, config, StopMarker) {
           var colors = ["blue", "orange", "purple", "maroon",
                         "steelblue", "gray"];

           function Routes(layer) {
               this.layer = layer;
               this.routeInfo = {};
               this._routeCount = 0;
           }

           $.extend(Routes.prototype, {
               loadRouteInfo: function(route_id, cacheOnly) {
                   var promise = $.Deferred();

                   if (this.routeInfo[route_id]) {
                       promise.resolve(this.routeInfo[route_id]);
                   } else if (cacheOnly) {
                       promise.reject("Route info not in cache.");
                   } else {
                       var self = this;
                       $.get("/api/routeinfo", {route: route_id})
                           .then(function(info) {
                               self.routeInfo[route_id] = info;
                               info.style = $.extend({
                                   color: config.colors[(self._routeCount++)%10]
                               },
                                                     config.defaultRouteStyle,
                                                     config.routeStyles[route_id]);
                               promise.resolve(info);
                           });
                   }

                   return promise;
               },

               showRoute: function(route_id) {
                   var layer = this.layer;

                   // TODO: Hide and show only certain route shapes.
                   this.loadRouteInfo(route_id)
                       .then(function(route) {
                           $.each(route.paths, function(i, path) {
                               var line = L.polyline(path, route.style)
                                       .addTo(layer)
                                       .bringToBack();
                               line._route_id = route_id;
                           });

                           $.each(route.stops, function(i, stop) {
                               var marker = new StopMarker(stop).addTo(layer);
                               marker._route_id = route_id;
                           });
                       });
               },

               getLayersForRoute: function(route_id) {
                   return $.grep(this.layer.getLayers(), function(layer) {
                       return (layer._route_id == route_id);
                   });
               },

               hideRoute: function(route_id) {
                   var layer = this.layer;
                   $.each(this.getLayersForRoute(route_id),
                          function(i, pathLayer) {
                              layer.removeLayer(pathLayer);
                          });
               },

               showRoutes: function(routes) {
                   var self = this;

                   $.each(routes, function(i, route_id) {
                       self.showRoute(route_id);
                   });
               }
           });

           return Routes;
       });
