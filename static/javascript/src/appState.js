define(["jquery", "underscore", "utils", "backbone", "routes-collection",
        "vehicles-collection", "stops-collection", "shapes-collection"],
       function($, _, $u, B, Routes, Vehicles, Stops, Shapes) {
           var defaultOptions = {tickInterval: 10000};
           function AppState(options) {
               if (!(this instanceof AppState))
                   return new AppState(options);

               this.options = $.extend({}, defaultOptions, options);
               // The route_ids, stop_ids, and vehicle_ids store the ids of the
               // current subscriptions.
               this.route_ids = [];
               this.stop_ids = [];
               this.vehicle_ids = [];

               this.stops = new Stops([], {app: this});
               // Stores the latest vehicle position, timepoints, heading, and
               // predictions. 
               this.vehicles = new Vehicles([], {app: this});
               this.routes = new Routes([], {app: this});
               this.shapes = new Shapes([], {app: this});
               this._last_active_shapes = {};
               // The timestamp of the last server fetch.
               this.last_tick = 0;

               return this;
           }

           _.extend(AppState.prototype, B.Events, {
               /**
                * Merge updates from the server into the current internal state.
                */
               mergeUpdates: function(updates) {
                   var stops = this.stops,
                       vehicles = this.vehicles,
                       self = this;

                   // Update stops with predictions:
                   _.each(updates.stops, function(preds, stop_id) {
                       var stop = stops.get(stop_id);

                       if (!stop) return;

                       stop.set({preds: preds});
                   });

                   _.each(updates.vehicles, function(vehicle) {
                       var lastBus = vehicles.get(vehicle.id);

                       if (!lastBus) {
                           vehicles.add(vehicle);
                           return;
                       }

                       if (lastBus.get("timestamp") >= vehicle.timestamp)
                           return;

                       lastBus.set(vehicle);
                   });

                   _.each(updates.vehicle_preds, function(preds, veh_id) {
                       var bus = vehicles.get(veh_id);

                       if (!bus) return;

                       bus.set({preds: preds});
                   });

                   var active_shapes = {},
                       shapes = self.shapes;
                   _.each(updates.active_shapes, function(shape_id) {
                       active_shapes[shape_id] = true;
                       if (!self._last_active_shapes[shape_id]) {
                           shapes.get(shape_id).set("active", true);
                       }
                   });
                   _.each(this._last_active_shapes, function(_, shape_id) {
                       if (!active_shapes[shape_id])
                           shapes.get(shape_id).set("active", false);
                   });
               },

               /**
                * @returns {Object|null} null if there are no updates to fetch;
                * otherwise, a map of query parameters to strings
                */
               getTickParams: function() {
                   var params = {};
                   if (this.route_ids.length)
                       params.routes = this.route_ids.join(",");
                   if (this.stop_ids.length)
                       params.stops = this.stop_ids.join(",");
                   if (this.vehicle_ids.length)
                       params.vehicles = this.vehicle_ids.join(",");

                   if (_.isEmpty(params))
                       return null;

                   params.since = this.last_tick;
                   return params;
               },

               scheduleTick: function(wait) {
                   if (!_.isNumber(wait)) wait = this.options.tickInterval;
                   clearTimeout(this._timeout);
                   return (this._timeout =
                           setTimeout($u.bind(this.tick, this), wait));
               },

               addItem: function(listprop, id) {
                   var ids = this[listprop];
                   if (ids.indexOf(id) == -1) {
                       ids.push(id);

                       this.scheduleTick(0);
                   }
               },

               removeItem: function(coll, id) {
                   var idx = coll.indexOf(id);
                   if (idx >= 0)
                       coll.splice(idx, 1);
               },

               /**
                * Register to start receiving predictions for the vehicle with
                * the specified id.
                */
               addVehicle: function(id) {
                   this.addItem("vehicle_ids", id);

                   var vehicle = this.vehicles.get(id);
                   if (!vehicle) return;
                   this.trigger("vehicleSelected", id, vehicle);
                   vehicle.set("_selected", true);
               },

               removeVehicle: function(id) {
                   var vehicle = this.vehicles.get(id);
                   if (!vehicle) return;
                   this.removeItem(this.vehicle_ids, id);
                   this.trigger("vehicleUnselected", id, vehicle);
                   vehicle.set("_selected", false);
               },

               addRoute: function(id) {
                   var self = this;
                   this.routes.getAndLoadRoute(id)
                       .done(function(route) {
                           self.addItem("route_ids", id);
                           self.trigger("routeSelected", id, route);
                       });
               },

               removeRoute: function(route_id) {
                   this.removeItem(this.route_ids, route_id);
                   this.trigger("routeUnselected", route_id);

                   // // Ugh...
                   // var self = this;
                   // _.each(this.vehicle_ids, function(id) {
                   //     var vehicle = self.vehicles.get(id);
                   //     if (!vehicle) return;
                   //     if (vehicle.get("route_id") == route_id) {
                   //         self.removeVehicle(vehicle.id);
                   //     }
                   // });

                   this.vehicles.remove(
                       this.vehicles.where({route_id: route_id}));
                   this.stops.remove(
                       this.stops.where({route_id: route_id}));
               },

               getSelectedRoutes: function() {
                   var routes = this.routes;
                   return _.map(this.route_ids,
                                function(id) { return routes.get(id); });
               },

               getSelectedVehicles: function() {
                   var vehicles = this.vehicles;
                   return _.map(this.vehicle_ids,
                                function(id) { return vehicles.get(id); });
               },

               tick: function(params, noReschedule) {
                   var self = this;
                   params = params || this.getTickParams();

                   // Don't bother if we don't have anything to fetch
                   if (!params) {
                       this.scheduleTick();
                       return;
                   }

                   $.get("/api/updates", params).
                       then(function(update) {
                           self.mergeUpdates(update);
                           if (!noReschedule)
                               self.scheduleTick();
                       });
               },

               start: function() {
                   this.tick();
                   return this;
               }
           });

           return AppState;
       });
