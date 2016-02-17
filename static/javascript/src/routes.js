/**
 * 
 */
define(["jquery", "leaflet", "config"],
       function($, L, config) {
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
                                   color: config.colors[self._routeCount++]
                               },
                                                     config.defaultRouteStyle,
                                                     config.routeStyles[route]);
                               promise.resolve(info);
                           });
                   }

                   return promise;
               },

               showRoute: function(route) {
                   var layer = this.layer;

                   // TODO: Hide and show only certain route shapes.
                   this.loadRouteInfo(route)
                       .then(function(route) {
                           $.each(route.paths, function(i, path) {
                               var line = L.polyline(path, route.style)
                                       .addTo(layer)
                                       .bringToBack();
                               route._layer = line;
                           });
                       });
               },

               hideRoute: function(route) {
                   var layer = this.layer;

                   this.loadRouteInfo(route, true)
                       .then(function(routeInfo) {
                           var routeLayer = routeInfo._layer;

                           if (routeLayer) {
                               layer.removeLayer(routeLayer);
                               delete routeInfo._layer;
                           }
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
