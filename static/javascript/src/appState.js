require(["jquery", "utils"],
        function($, $u) {
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

                // Stores the latest stop predictions, indexed by stop id:
                this.stops = {};
                // Stores the latest vehicle position, timepoints, heading, and
                // predictions. 
                this.vehicles = {};
                // The timestamp of the last server fetch.
                this.last_tick = 0;
                this.vehicleSubscribers = {};

                return this;
            }

            $.extend(AppState.prototype, {
                /**
                 * Merge updates from the server into the current internal state.
                 */
                mergeUpdates: function(updates) {
                    var stops = this.stops,
                        vehicles = this.vehicles,
                        updated_set = {},
                        self = this;

                    $.each(updates.stops, function(stop_id, stop) {
                        stops[stop_id] = stop;
                        // Should actually do a comparison to determine if
                        // anything has changed since the last fetch.
                        stops[stop_id].changed = updates.stamp;
                    });

                    $.each(updates.buses, function(i, bus) {
                        var lastBus = vehicles[bus.id];

                        if (lastBus && lastBus.timestamp >= bus.timestamp)
                            return;

                        vehicles[bus.id] = bus;
                        vehicles[bus.id].changed = updates.stamp;

                        updated_set[bus.id] = true;
                    });

                    $.each(updates.vehicle_preds, function(veh_id, preds) {
                        var bus = vehicles[veh_id];

                        if (!bus) {
                            bus = vehicles[veh_id] = {changed: updates.stamp};
                        }

                        bus.preds = preds;

                        updated_set[veh_id] = true;
                    });


                    $.each(this.vehicleSubscribers, function(veh_id, fns) {
                        if (updated_set[veh_id]) {
                            $.each(fns, function(i, fn) {
                                fn(vehicles[veh_id]);
                            });
                        }
                    });
                },

                getTickParams: function() {
                    var params = {since: this.last_tick};
                    if (this.route_ids.length)
                        params.routes = this.route_ids.join(",");
                    if (this.stop_ids.length)
                        params.stop = this.stop_ids.join(",");
                    if (this.vehicle_ids.length)
                        params.vehicles = this.vehicle_ids.join(",");
                    return params;
                },

                scheduleTick: function() {
                    clearTimeout(this._timeout);
                    return (this._timeout =
                            setTimeout($u.bind(this.tick, this),
                                       this.options.tickInterval));
                },

                addItem: function(listprop, event, id) {
                    var ids = this[listprop];
                    if (ids.indexOf(id) == -1) {
                        ids.push(id);
                        $(this).trigger(event, id);

                        var tickParams = {};
                        tickParams[listprop] = "" + id;
                        this.tick(tickParams);
                    }
                },

                removeItem: function(listprop, event, id) {
                    var ids = this[listprop],
                        idx = ids.indexOf(id);
                    if (idx >= 0) {
                        ids.splice(idx, 1);
                        $(this).trigger(event, id);
                    }
                },

                addVehicle: function(id) {
                    return this.addItem("vehicle_ids", "vehicleSelected", id);
                },

                removeVehicle: function(id) {
                    return this.removeItem("vehicle_ids", "vehicleUnselected", id);
                },

                addRoute: function(id) {
                    return this.addItem("route_ids", "routeSelected", id);
                },

                removeRoute: function(id) {
                    return this.removeItem("route_ids", "routeUnselected", id);
                },

                getVehicle: function(id) {
                    return this.vehicles[id];
                },

                addBusListener: function(id, fn) {
                    if (!this.vehicleSubscribers[id])
                        this.vehicleSubscribers[id] = [];

                    this.vehicleSubscribers[id].push(fn);
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
