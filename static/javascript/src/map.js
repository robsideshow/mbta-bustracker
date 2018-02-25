define(["jquery", "leaflet", "backbone", "stop-marker",
        "bus-marker", "vehicle-etas-view", "alert-view", "utils", "underscore",
        "path-utils", "config"],
       function($, L, B, StopMarker, BusMarker, VehicleETAsView, AlertView, $u,
                _, $p, config) {
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
               // alert id -> Popup
               this.alertPopups = {};
               this.stopAlerts = {};
               this.boundsLimit = L.latLngBounds(
                   config.bounds[0],
                   config.bounds[1]);

               this.init();

               this._nextTick = Infinity;
               this._isLocating = false;
               this._captureClickLocation = false;

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
                       L.tileLayer(config.tilesURL)
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
                       .listenTo(app, "locationSet", this.onLocationSet)
                   // Vehicles:
                       .listenTo(app.vehicles, "add", this.onVehicleAdded)
                       .listenTo(app.vehicles, "remove", this.onVehicleRemoved)
                   // Stops:
                       .listenTo(app.stops, "add", this.onStopAdded)
                       .listenTo(app.stops, "remove", this.onStopRemoved)
                   // Alerts:
                       .listenTo(app.alerts, "add", this.onAlertAdded)
                       .listenTo(app.alerts, "remove", this.onAlertRemoved);

                   this.map.on("click", _.bind(this.onClick, this));
                   this.map.on("moveend", _.bind(this.updateStops, this));
                   this.map.on("locationfound", _.bind(this.locationFound, this));
                   this.map.on("locationerror", _.bind(this.locationError, this));
               },

               onClick: function(e) {
                   this.app.clearVehicles();
                   this.app.unselectStop();

                   if (this._captureClickLocation) {
                       this._userInitiated = true;
                       this._captureClickLocation = false;
                       this.elt.removeClass("click-to-zoom");
                       try {
                           this.setLocation(e.latlng);
                       } catch (err) {
                           if (err.message == "outside_map_area") {
                               alert("That is outside the map area!");
                           }
                       }
                   }
               },

               showStartView: function() {
                   var map = this;
                   $u.canLocate().then(function(canLocate) {
                       if (canLocate) {
                           map.toggleLocationWatch();
                       } else {
                           map.app.addRoutes(config.defaultRoutes);
                       }
                   });
               },

               captureLocation: function() {
                   this.elt.addClass("click-to-zoom");
                   this._captureClickLocation = true;
               },

               updateStops: function(e) {
                   this.app.stops.setMapArea(this.map.getZoom() >= 16 ?
                                             this.map.getBounds() :
                                             null,
                                             this._locationViewSet);
                   this._locationViewSet = false;

                   var zoom = this.map.getZoom(),
                       bounds = this.map.getBounds();

                   _.each(this.stopMarkers,
                          function(marker) {
                              if (bounds.contains(marker.stop.getLatLng()))
                                  marker.setScale(zoom);
                          });
               },

               startLocationWatch: function() {
                   this._isLocating = true;
                   this._userInitiated = true;
                   this.map.locate({watch: true});
                   this.app.trigger("geolocating", true);
               },

               stopLocationWatch: function() {
                   this._isLocating = false;
                   this.map.stopLocate();
                   this.app.trigger("geolocating", false);
               },

               toggleLocationWatch: function() {
                   if (this._isLocating)
                       this.stopLocationWatch();
                   else
                       this.startLocationWatch();
               },

               setLocation: function(ll) {
                   if (this._userInitiated) {
                       this._userInitiated = false;
                       if (!this.boundsLimit.contains(ll)) {
                           throw new Error("outside_map_area");
                       }

                       this._locationViewSet = true;
                       this.map.setView(ll, 17);
                   }

                   if (this.locationMarker) {
                       this.locationMarker.setLatLng(ll);
                   } else {
                       this.locationMarker =
                           L.marker(ll).addTo(this.map);
                   }
               },

               locationFound: function(e) {
                   try {
                       this.setLocation(e.latlng);
                   } catch (err) {
                       if (err.message == "outside_map_area") {
                           alert("You are outside the map area!");
                           this.stopLocationWatch();
                       }
                   }
               },

               locationError: function(e) {
                   this.stopLocationWatch();
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

                   if (!parent_id) {
                       this.stopMarkers[stop.id] =
                           new StopMarker(stop, this.app, this.map.getZoom())
                           .addTo(this.routesLayer);

                       // Check if there are alerts for this stop that have
                       // already been loaded.
                       var stop_alerts = this.app.alerts.forStop(stop),
                           self = this;
                       _.each(stop_alerts,
                              function(alert) {
                                  self.showAlert(stop.id, alert);
                              });
                   }
               },

               onStopRemoved: function(stop) {
                   var stopMarker = this.stopMarkers[stop.id];

                   if (stopMarker)
                       this.routesLayer.removeLayer(stopMarker);
                   delete this.stopMarkers[stop.id];

                   if (this.selectedStop == stop.id)
                       this.cleanupETAPopup();

                   var alertPopup = this.alertPopups[stop.id];
                   if (alertPopup) {
                       this.map.removeLayer(alertPopup);
                       alertPopup.view.remove();
                       delete this.alertPopups[stop.id];
                   }
               },

               /**
                * Vehicle ETA predictions for the selected stop:
                */
               onStopSelected: function(id, stop) {
                   if (this.selectedStop)
                       this.onStopUnselected(this.selectedStop);

                   // If there is an alert popup for this stop, hide it:
                   var alertPopup = this.alertPopups[id];
                   if (alertPopup) {
                       this.map.removeLayer(alertPopup);
                       alertPopup.view.remove();
                       delete this.alertPopups[id];
                   }

                   this.selectedStop = id;
                   var popup = L.popup({autoPan: false,
                                        keepInView: false,
                                        closeButton: false,
                                        closeOnClick: false,
                                        className: "eta-preds",
                                        minWidth: 225})
                       .setLatLng(stop.getLatLng())
                       .addTo(this.map);

                   this.selectedStopView = new VehicleETAsView({
                       app: this.app,
                       model: stop,
                       alerts: this.app.alerts.forStop(stop)
                   }).render();
                   this.selectedStopPopup = popup;
                   popup.setContent(this.selectedStopView.el);

                   this._nextTick = 0;
               },

               onStopUnselected: function(id) {
                   if (this.selectedStop == id)
                       this.cleanupETAPopup();


               },

               cleanupETAPopup: function() {
                   this.selectedStopView.remove();
                   this.map.removeLayer(this.selectedStopPopup);
                   this.selectedStop =
                       this.selectedStopPopup =
                       this.selectedStopView = null;
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
                   var bounds = this.getRoutesBounds();

                   if (bounds) this.map.fitBounds(bounds);
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
                   this._selectedId = id;
                   this.listenTo(vehicle, "change:preds",
                                 this.onVehiclePredsUpdate)
                       .listenTo(vehicle, "remove", function() {
                           // Cleanup and hide predictions if the vehicle is removed:
                           this.onVehicleUnselected(id, vehicle);
                       });
                   if (vehicle.get("preds")) {
                       this.onVehiclePredsUpdate(vehicle, vehicle.get("preds"));
                   }
                   this._nextTick = 0;
               },

               onVehicleUnselected: function(id, vehicle) {
                   if (this._selectedId == id)
                       this._selectedId = null;
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

               showAlert: function(stop_id, alert) {
                   if (this.selectedStop == stop_id) {
                       // Update the popup!
                       this.selectedStopView.addAlert(alert);
                   } else if (this.stopMarkers[stop_id]) {
                       var stop = this.app.stops.get(stop_id),
                           popup = L.popup({autoPan: false,
                                            keepInView: false,
                                            closeButton: false,
                                            closeOnClick: false,
                                            className: "alert",
                                            offset: L.point(0, -2)})
                               .setLatLng(stop.getLatLng())
                               .addTo(this.map);

                       popup.view = new AlertView({
                           model: alert
                       }).render();
                       popup.setContent(popup.view.el);
                       this.alertPopups[stop_id] = popup;
                   }
               },

               hideAlert: function(alert) {
                   var stop_ids = alert.getStopIds(),
                       self = this;

                   _.each(stop_ids, function(stop_id) {
                       if (self.selectedStop == stop_id) {
                           self.selectedStopView.clearAlert(alert);
                           return;
                       }

                       var popup = self.alertPopups[stop_id];
                       if (!popup) return;

                       // TODO: Provide a visual indication that the issue is
                       // resolved before removing the alert.

                       self.map.removeLayer(popup);
                       popup.view.remove();
                       delete self.alertPopups[stop_id];
                   });
               },

               onAlertAdded: function(alert) {
                   var self = this;

                   _.each(alert.get("stop_ids"),
                          function(__, stop_id) {
                              self.showAlert(stop_id, alert);
                          });
               },

               onAlertRemoved: function(alert) {
                   this.hideAlert(alert);
               },

               // Code supporting animations:
               onVehiclePredsUpdate: function(vehicle, preds) {
                   var stops = this.app.stops,
                       popups = this.stopPopups,
                       stopPreds = {},
                       stamp = $u.stamp(),
                       self = this,
                       selectedStop = stops.get(this.selectedStop);

                   _.each(preds, function(pred) {
                       var id = pred.stop_id,
                           stop = stops.get(id);

                       if (!stop || pred.arr_time <= stamp)
                           return;

                       if (selectedStop && selectedStop.hasId(id))
                           return;

                       stopPreds[id] = pred;

                       if (!popups[id]) {
                           var $popupContent = $("<div/>");
                           $popupContent
                               .addClass("popup-content stop-eta")
                               .html("xxx:xx");
                           popups[id] = L.popup({autoPan: false,
                                                 keepInView: false,
                                                 closeButton: false,
                                                 closeOnClick: false},
                                               self.stopMarkers[id])
                               .setLatLng(stop.getLatLng())
                               .setContent($popupContent[0])
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
                           var el = popup.getContent();
                           el.innerHTML =
                               $u.briefRelTime(pred.arr_time - stamp);
                       } else {
                           self.map.removeLayer(popup);
                           delete popups[stop_id];
                           delete stopPreds[stop_id];
                       }
                   });
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
