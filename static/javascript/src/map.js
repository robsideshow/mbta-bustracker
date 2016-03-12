define(["jquery", "leaflet", "backbone", "routes", "stop-marker",
        "bus-marker", "utils", "underscore"],
       function($, L, B, Routes, StopMarker, BusMarker, $u, _) {
           /**
            * @param {HTMLElement|string} elt Element or selector string
            * @param {AppState} appState
            * @param {Animation} animation
            */
           function Map(elt, appState, animation) {
               if (!this instanceof Map)
                   return new Map(elt, appState);

               this.elt = $(elt);
               this.appState = appState;
               this.animation = animation;
               // Map of stop id -> StopMarkers
               this.stopMarkers = {};
               this.busMarkers = {};
               this.routesLayer = null;

               this.listenTo(appState, "routeSelected", this.onRouteSelected)
                   .listenTo(appState, "routeUnselected",
                             this.onRouteUnselected)
                   .listenTo(appState.vehicles, "add", this.onVehicleAdded)
                   .listenTo(appState.vehicles, "remove", this.onVehicleRemoved);

               this.init();

               return this;
           }

           $.extend(Map.prototype, B.Events, {
               init: function() {
                   this.map = L.map(this.elt[0], {
                       center: [42.36564700281194, -71.06386184692381],
                       zoom: 15
                   });
                   this.tileLayer = 
                       L.tileLayer("http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png")
                       .addTo(this.map);
                   this.routesLayer = L.layerGroup().addTo(this.map);
                   this.busLayer = L.layerGroup().addTo(this.map);
               },

               onVehicleAdded: function(bus, vehicles) {
                   var marker = this.busMarkers[bus.id];

                   if (marker) return;

                   marker = new BusMarker(bus).addTo(this.map);
                   marker._route_id = bus.get("route_id");
                   this.busMarkers[bus.id] = marker;
                   this.animation.addObject(marker);
               },

               onVehicleRemoved: function(bus, vehicles) {
                   var marker = this.busMarkers[bus.id];

                   if (marker) {
                       this.animation.removeObject(marker);
                       this.busLayer.removeLayer(marker);
                       delete this.busMarkers[bus.id];
                   }
               },

               onRouteSelected: function(route_id, route) {
                   var self = this;

                   route.loadInfo()
                       .done(function(routeModel) {
                           var route = routeModel.attributes,
                               route_id = routeModel.id;
                           _.each(route.paths, function(path) {
                               var line = L.polyline(path, route.style)
                                       .addTo(self.routesLayer)
                                       .bringToBack();
                               line._route_id = route_id;
                           });

                           _.each(route.stops, function(stop) {
                               var marker = new StopMarker(stop)
                                       .addTo(self.routesLayer);
                               marker._route_id = route_id;
                               self.stopMarkers[stop.stop_id] = marker;
                           });
                       });
               },

               getRouteLayers: function(route_id) {
                   return $.grep(this.routesLayer.getLayers(), function(layer) {
                       return (layer._route_id == route_id);
                   });
               },

               /**
                * Calculates and returns the bounds of all the current visible
                * route paths.  If there are no routes displayed, returns null.
                *
                * @return {L.LatLngBounds|null}
                */
               getRoutesBounds: function() {
                   var i = 0, bounds = null, layers = this.routesLayer.getLayers(),
                       layer;

                   while ((layer = layers[i++])) {
                       if (bounds)
                           bounds.extend(layer.getBounds());
                       else
                           bounds = layer.getBounds();
                   }

                   return bounds;
               },

               fitRouteBounds: function() {
                   var bounds = this.getRoutesBound();

                   if (bounds) this.fitBounds(bounds);
               },

               getRouteVehicles: function(route_id) {
                   return $.grep(this.busLayer.getLayers(), function(layer) {
                       return layer._route_id == route_id;
                   });
               },

               onRouteUnselected: function(event, route_id) {
                   var routesLayer = this.routesLayer,
                       busLayer = this.busLayer;

                   $.each(routesLayer.getLayers(), function(i, layer) {
                       if (layer._route_id == route_id)
                           routesLayer.removeLayer(layer);
                   });
                   $.each(busLayer.getLayers(), function(i, layer) {
                       if (layer._route_id == route_id)
                           busLayer.removeLayer(layer);
                   });
               }
           });

           return Map;
       });
