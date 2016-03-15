define(["jquery", "underscore", "utils", "backbone", "routes-collection",
        "vehicles-collection", "stops-collection"],
       function($, _, $u, B, Routes, Vehicles, Stops) {
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

                       stop.set({predictions: preds});
                   });

                   $.each(updates.buses, function(i, bus) {
                       var lastBus = vehicles.get(bus.id);

                       if (!lastBus) {
                           vehicles.add(bus);
                           return;
                       }

                       if (lastBus.get("timestamp") >= bus.timestamp)
                           return;

                       lastBus.set(bus);
                   });

                   $.each(updates.vehicle_preds, function(veh_id, preds) {
                       var bus = vehicles.get(veh_id);

                       if (!bus) return;

                       bus.set({preds: preds});
                   });
               },

               getTickParams: function() {
                   var params = {since: this.last_tick};
                   if (this.route_ids.length)
                       params.routes = this.route_ids.join(",");
                   if (this.stop_ids.length)
                       params.stops = this.stop_ids.join(",");
                   if (this.vehicle_ids.length)
                       params.vehicles = this.vehicle_ids.join(",");
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
                   this.removeItem(this.route_id, route_id);
                   this.trigger("routeUnselected", route_id);
                   this.vehicles.remove(
                       this.vehicles.where({route_id: route_id}));
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
                   $.get("/api/bus_updates", params).
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
