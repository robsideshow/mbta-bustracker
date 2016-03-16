define(["jquery", "leaflet", "backbone", "stop-marker",
        "bus-marker", "utils", "underscore"],
       function($, L, B, StopMarker, BusMarker, $u, _) {
           /**
            * @param {HTMLElement|string} elt Element or selector string
            * @param {AppState} app
            * @param {Animation} animation
            */
           function VehicleMap(elt, app, animation) {
               if (!this instanceof VehicleMap)
                   return new VehicleMap(elt, app);

               this.elt = $(elt);
               this.app = app;
               this.animation = animation;
               // Map of stop id -> StopMarkers
               this.stopMarkers = {};
               // Map of stop id -> Popups
               this.stopPopups = {};
               this._stopPreds = {};
               // vehicle id -> BusMarker
               this.busMarkers = {};

               this.listenTo(app, "routeSelected", this.onRouteSelected)
                   .listenTo(app, "routeUnselected", this.onRouteUnselected)
                   .listenTo(app, "vehicleSelected", this.onVehicleSelected)
                   .listenTo(app, "vehicleUnselected", this.onVehicleUnselected)
                   .listenTo(app.vehicles, "add", this.onVehicleAdded)
                   .listenTo(app.vehicles, "remove", this.onVehicleRemoved)
                   .listenTo(app.stops, "remove", this.onStopRemoved);

               this.init();

               this._nextTick = Infinity;

               return this;
           }

           $.extend(VehicleMap.prototype, B.Events, {
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
                   this.animation.addObject(this);
               },

               /**
                * Triggered when a vehicle is added to the vehicles collection.
                */
               onVehicleAdded: function(bus, vehicles) {
                   var marker = this.busMarkers[bus.id];

                   if (marker) return;

                   marker = new BusMarker(bus).addTo(this.busLayer);
                   marker._route_id = bus.get("route_id");
                   this.busMarkers[bus.id] = marker;
                   this.animation.addObject(marker);

                   var self = this;
                   marker.on("click", function() {
                       var vehId = bus.id;

                       if (vehId == self._selectedId) return;

                       if (self._selectedId) {
                           self.app.removeVehicle(self._selectedId);
                       }

                       self.app.addVehicle(vehId);
                       self._selectedId = vehId;
                   });
               },

               onVehicleRemoved: function(bus, vehicles) {
                   var marker = this.busMarkers[bus.id];

                   if (marker) {
                       this.animation.removeObject(marker);
                       this.busLayer.removeLayer(marker);
                       delete this.busMarkers[bus.id];
                   }
               },

               onStopRemoved: function(stop) {
                   var stopMarker = this.stopMarkers[stop.id];

                   if (stopMarker)
                       this.routesLayer.removeLayer(stopMarker);
                   delete this.stopMarkers[stop.id];
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

               onRouteUnselected: function(route_id) {
                   var routesLayer = this.routesLayer,
                       self = this;

                   _.each(routesLayer.getLayers(), function(layer) {
                       if (layer._route_id == route_id)
                           routesLayer.removeLayer(layer);
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

               // Displaying stop predictions:
               onVehicleSelected: function(id, vehicle) {
                   this.listenTo(vehicle, "change:preds",
                                 this.onVehiclePredsUpdate)
                       .listenTo(vehicle, "remove", function() {
                           // Cleanup and hide predictions if the vehicle is removed:
                           this.onVehicleUnselected(id, vehicle);
                       });
                   this._nextTick = 0;
               },

               onVehicleUnselected: function(id, vehicle) {
                   this.stopListening(vehicle);
                   var preds = vehicle.get("preds");

                   if (preds) {
                       var popups = this.stopPopups,
                           self = this;

                       _.each(preds, function(pred) {
                           var popup = popups[pred.stop_id];

                           try {
                               self.map.removeLayer(popup);
                           } catch (err) {
                               console.error(err);
                           }
                           delete popups[pred.stop_id];
                           delete self._stopPreds[pred.stop_id];
                       });
                   }
               },

               onVehiclePredsUpdate: function(vehicle, preds) {
                   var stops = this.app.stops,
                       popups = this.stopPopups,
                       stopPreds = {},
                       stamp = $u.stamp(),
                       self = this;

                   _.each(preds, function(pred) {
                       var id = pred.stop_id,
                           stop = stops.get(id);

                       if (!stop) return;
                       if (pred.arr_time <= stamp) return;

                       stopPreds[id] = pred;

                       if (!popups[id]) {
                           popups[id] = L.popup({autoPan: false,
                                                 keepInView: false,
                                                 closeButton: false,
                                                 closeOnClick: false,
                                                 className: "stop-prediction"},
                                               self.stopMarkers[id])
                               .setLatLng(stop.getLatLng())
                               .setContent("Loading...")
                               .addTo(self.map);
                       }
                   });

                   _.each(_.keys(popups), function(id) {
                       if (!stopPreds[id]) {
                           self.map.removeLayer(popups[id]);

                           delete popups[id];
                       }
                   });

                   // Cache the map of stop id -> stop preds
                   this._stopPreds = stopPreds;
                   this._nextTick = 0;
               },

               updateStopPopups: function(stamp) {
                   var stopPreds = this._stopPreds,
                       popups = this.stopPopups,
                       self = this;
                   _.each(_.keys(popups), function(stop_id) {
                       var popup = popups[stop_id],
                           pred = stopPreds[stop_id];

                       if (pred.arr_time > stamp) {
                           popup.setContent(
                               "<b>" + _.escape(pred.stop_name) + "</b><br>" +
                               "Arriving " +
                                   $u.briefRelativeTime(pred.arr_time - stamp));
                       } else {
                           self.map.removeLayer(popup);
                           delete popups[stop_id];
                           delete stopPreds[stop_id];
                       }
                   });
               },

               // Animations:
               tick: function(dt, stamp) {
                   if (stamp < this._nextTick || !this._selectedId)
                       return;

                   this._nextTick = stamp + 1000;

                   // predictions are in seconds:
                   stamp /= 1000;

                   this.updateStopPopups(stamp);

               }
           });

           return VehicleMap;
       });
