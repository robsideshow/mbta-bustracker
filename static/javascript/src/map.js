define(["jquery", "leaflet", "app-state", "routes", "stop-marker", "utils"],
       function($, L, appState, Routes, StopMarker, $u) {
           function Map(elt, appState) {
               if (!this instanceof Map)
                   return new Map(elt, appState);

               this.elt = $(elt);
               this.appState = appState;
               // Map of stop id -> StopMarkers
               this.stopMarkers = {};
               this.busMarkers = {};
               this.routesLayer = null;

               $(appState).on("routeSelected",
                              $u.bind(this.onRouteSelected, this));
               $(appState).on("routeUnselected",
                              $u.bind(this.onRouteUnselected, this));

               this.init();

               return this;
           }

           $.extend(Map.prototype, {
               init: function() {
                   this.map = L.map(this.elt[0], {
                       center: [42.36564700281194, -71.06386184692381],
                       zoom: 15
                   });
                   this.routesLayer = L.layerGroup().addTo(this.map);
                   this.busLayer = L.layerGroup().addTo(this.map);
               },

               onRouteSelected: function(event, route_id) {
                   var self = this;

                   Routes.loadRouteInfo(route_id)
                       .done(function(route) {
                           $.each(route.paths, function(i, path) {
                               var line = L.polyline(path, route.style)
                                       .addTo(self.routesLayer)
                                       .bringToBack();
                               line._route_id = route_id;
                           });

                           $.each(route.stops, function(i, stop) {
                               var marker = new StopMarker(stop)
                                       .addTo(self.routesLayer);
                               marker._route_id = route_id;
                               self.stopMarkers[stop.stop_id] = marker;
                           });
                       });
               },

               getLayersForRoute: function(route_id) {
                   return $.grep(this.routesLayer.getLayers(), function(layer) {
                       return (layer._route_id == route_id);
                   });
               },


               onRouteUnselected: function(event, route_id) {
                   var routesLayer = this.routesLayer;
                   $.each(this.routesLayer.getLayers(), function(layer) {
                       if (layer._route_id == route_id)
                           routesLayer.removeLayer(layer);
                   });
                   $.each(this.busLayer.getLayers(), function(layer) {
                       if (layer._route_id == route_id)
                           busLayer.removeLayer(layer);
                   });
               }
           });

           return Map;
       });
