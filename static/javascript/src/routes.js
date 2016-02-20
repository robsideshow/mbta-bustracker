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
               loadRouteInfo: function(route, cacheOnly) {
                   var promise = $.Deferred();

                   if (this.routeInfo[route]) {
                       promise.resolve(this.routeInfo[route]);
                   } else if (cacheOnly) {
                       promise.reject("Route info not in cache.");
                   } else {
                       var self = this;
                       $.get("/api/routeinfo", {route: route})
                           .then(function(info) {
                               self.routeInfo[route] = info;
                               info.style = $.extend({
                                   color: config.colors[(self._routeCount++)%10]
                               },
                                                     config.defaultRouteStyle,
                                                     config.routeStyles[route]);
                               promise.resolve(info);
                           });
                   }

                   return promise;
               },

               showRoute: function(routeName) {
                   var layer = this.layer;

                   // TODO: Hide and show only certain route shapes.
                   this.loadRouteInfo(routeName)
                       .then(function(route) {
                           $.each(route.paths, function(i, path) {
                               var line = L.polyline(path, route.style)
                                       .addTo(layer)
                                       .bringToBack();
                               line._route = routeName;
                           });

                           $.each(route.stops, function(i, stop) {
                               var marker = new StopMarker(stop).addTo(layer);
                               marker._route = routeName;
                           });
                       });
               },

               getLayersForRoute: function(route) {
                   return $.grep(this.layer.getLayers(), function(layer) {
                       return (layer._route == route);
                   });
               },

               hideRoute: function(route) {
                   var layer = this.layer;
                   $.each(this.getLayersForRoute(route),
                          function(i, pathLayer) {
                              layer.removeLayer(pathLayer);
                          });
               },

               showRoutes: function(routes) {
                   var self = this;

                   $.each(routes, function(i, route) {
                       self.showRoute(route);
                   });
               }
           });

           return Routes;
       });
