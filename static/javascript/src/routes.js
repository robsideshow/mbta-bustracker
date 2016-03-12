/**
 * 
 */
define(["jquery", "leaflet", "config", "stop-marker"],
       function($, L, config, StopMarker) {
           var colors = ["blue", "orange", "purple", "maroon",
                         "steelblue", "gray"];
           return {
               routeInfo: {},
               showing: [],
               _routeCount: 0,
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
                               info.id = route_id;
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
                   var layer = this.layer,
                       self = this;

                   // TODO: Hide and show only certain route shapes.
                   return this.loadRouteInfo(route_id)
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

                           self.showing.push(route_id);

                           return this;
                       });
               },

               hideRoute: function(route_id) {
                   var layer = this.layer;

                   this.showing = $.grep(this.showing,
                                         function(id) { return id !== route_id; });
                   $(this).trigger("routesChanged", [route_id]);

                   return $.Deferred().resolve(this);
               },

               showRoutes: function(routes) {
                   var self = this;

                   $.each(routes, function(i, route_id) {
                       self.showRoute(route_id);
                   });
               },

               getRoutes: function() {
                   var self = this;
                   return $.map(this.showing, function(route_id) {
                       return self.routeInfo[route_id];
                   });
               },

               getBounds: function() {
                   var i = 0, bounds = null, layers = this.layer.getLayers(),
                       layer;

                   while ((layer = layers[i++])) {
                       if (bounds)
                           bounds.extend(layer.getBounds());
                       else
                           bounds = layer.getBounds();
                   }

                   return bounds;
               }
           };

       });
