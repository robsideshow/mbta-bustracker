define(["jquery", "leaflet", "backbone", "stop-marker",
        "bus-marker", "stop-vehicles-view", "utils", "underscore", "path-utils"],
       function($, L, B, StopMarker, BusMarker, StopVehiclesView, $u, _, $p) {
           /**
            * @param {HTMLElement|string} elt Element or selector string
            * @param {AppState} app
            * @param {Animation} animation
            */
           function VehicleMap(elt, app, animation) {
               window.$p = $p;
               if (!(this instanceof VehicleMap))
                   return new VehicleMap(elt, app);

               this.elt = $(elt);
               this.app = app;
               this.animation = animation;
               // Map of stop id -> StopMarkers
               this.stopMarkers = {};
               // Map of stop id -> Popups
               this.stopPopups = {};
               this.stopPredsPopup = null;
               this._stopPreds = {};
               // vehicle id -> BusMarker
               this.busMarkers = {};

               this.init();

               this._nextTick = Infinity;

               // Used to keep track of the path segments that have been placed:
               this._segMap = {};

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

                   var app = this.app;
                   this.listenTo(app, "routeSelected", this.onRouteSelected)
                       .listenTo(app, "routeUnselected", this.onRouteUnselected)
                       .listenTo(app, "vehicleSelected", this.onVehicleSelected)
                       .listenTo(app, "vehicleUnselected", this.onVehicleUnselected)
                       .listenTo(app, "stopSelected", this.onStopSelected)
                       .listenTo(app, "stopUnselected", this.onStopUnselected)
                       .listenTo(app, "focusRoute", this.onRouteFocused)
                       .listenTo(app.vehicles, "add", this.onVehicleAdded)
                       .listenTo(app.vehicles, "remove", this.onVehicleRemoved)
                       .listenTo(app.stops, "add", this.onStopAdded)
                       .listenTo(app.stops, "remove", this.onStopRemoved);

                   this.map.on("click", _.bind(this.onClick, this));
               },

               onClick: function(e) {
                   this.app.clearVehicles();
                   this.app.unselectStop();
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

               onStopAdded: function(stop) {
                   var parent_id = stop.get("parent");

                   if (!parent_id ) {
                       this.stopMarkers[stop.id] =
                           new StopMarker(stop, this.app).addTo(this.routesLayer);
                   }
               },

               onStopRemoved: function(stop) {
                   var stopMarker = this.stopMarkers[stop.id];

                   if (stopMarker)
                       this.routesLayer.removeLayer(stopMarker);
                   delete this.stopMarkers[stop.id];
               },

               /**
                * Vehicle ETA predictions for the selected stop:
                */
               onStopSelected: function(id, stop) {
                   if (this.selectedStop)
                       this.onStopUnselected(this.selectedStop);

                   this.selectedStop = id;
                   var popup = L.popup({autoPan: false,
                                        keepInView: false,
                                        closeButton: false,
                                        closeOnClick: false,
                                        className: "eta-preds",
                                        minWidth: 225})
                       .setLatLng(stop.getLatLng())
                       .addTo(this.map);

                   this.selectedStopView = new StopVehiclesView({
                       app: this.app,
                       model: stop
                   }).render();
                   this.selectedStopPopup = popup;
                   popup.setContent(this.selectedStopView.el);

                   this._nextTick = 0;
               },

               onStopUnselected: function(id) {
                   if (this.selectedStop == id) {
                       this.selectedStopView.remove();
                       this.map.removeLayer(this.selectedStopPopup);
                       this.selectedStop =
                           this.selectedStopPopup =
                           this.selectedStopView = null;
                   }
               },

               hideVehicleETAs: function(id) {
                   if (this.selectedStopView) {
                       this.selectedStopView.remove();
                       this.map.removeLayer(this.selectedStopPopup);
                   }
                   this.selectedStop = null;
                   this.selectedStopView = null;
                   this.selectedStopPopup = null;
               },

               /**
                * Redraw the contents of the vehicle ETA popup for the selected
                * stop.
                *
                * @param {Number} stamp
                */
               updateStopVehiclePopup: function(stamp) {

               },

               onRouteSelected: function(route_id, routeModel) {
                   var route = routeModel.attributes,
                       self = this;

                   _.each(route.paths, function(path) {
                       var adjustedPath = $p.placePath(self._segMap, path,
                                                       route_id, $p.llNormal);

                       var line = L.polyline(adjustedPath, route.style)
                               .addTo(self.routesLayer)
                               .bringToBack();
                       line._route_id = route_id;
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

               onRouteFocused: function(route_id) {
                   this.fitRoute(route_id);
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

               /**
                * Fit the map's view area to fit all currently displayed routes.
                */
               fitRouteBounds: function() {
                   var bounds = this.getRoutesBound();

                   if (bounds) this.fitBounds(bounds);
               },

               /**
                * Fits the map view area to fit the active shapes for the route
                * with the given id.
                *
                * @param {String|Number} route_id
                */
               fitRoute: function(route_id) {
                   var route = this.app.routes.get(route_id),
                       bounds = route.getActiveBounds() || route.getBounds();

                   this.map.fitBounds(bounds);
               },

               /**
                * Fits the map view area to fit all shapes for the route with
                * the given id.
                */
               fitWholeRoute: function(route_id) {
                   var route = this.app.routes.get(route_id);

                   this.map.fitBounds(route.getBounds());
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

                           if (popup) {
                               self.map.removeLayer(popup);
                           }

                           delete popups[pred.stop_id];
                           delete self._stopPreds[pred.stop_id];
                       });
                   }
               },

               loadVisibleStops: function() {
                   var bounds = this.map.getBounds();
                   $.get("/api/rectangle",
                         {swlat: bounds.getSouth(),
                          swlon: bounds.getWest(),
                          nelat: bounds.getNorth(),
                          nelon: bounds.getEast()})
                       .then(function(resp) {
                           console.log(resp);
                       });
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

               updateVehiclePredictions: function(stamp) {

               },

               // Animations:
               tick: function(dt, stamp) {
                   if (stamp < this._nextTick || (!this._selectedId &&
                                                  !this.selectedStopView))
                       return;

                   this._nextTick = stamp + 1000;

                   // predictions are in seconds:
                   stamp /= 1000;

                   if (this._selectedId)
                       this.updateStopPopups(stamp);

                   if (this.selectedStopView)
                       this.selectedStopView.render(stamp);
               }
           });

           return VehicleMap;
       });
