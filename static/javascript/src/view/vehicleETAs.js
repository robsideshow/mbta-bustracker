define(["backbone", "underscore", "utils", "config", "templates"],
       function(B, _, $u, config, $t) {
           var StopVehiclesView = B.View.extend({
               initialize: function(options) {
                   options = options || {};
                   B.View.prototype.initialize.call(this, options);
                   this.app = options.app;

                   this.lastStamp = 0;

                   // Map of mode -> "0"/"1"
                   this.modeDirections = this._updateModeDirs();

                   this.alerts = options.alerts || [];

                   // The route_ids associated with the stop should never
                   // change (we get a complete list from /routeinfo), so there
                   // should be no need to subscribe to route_id changes.
                   // this.listenTo(this.model, "change:route_ids",
                   // this._updateRoutes);
                   this.listenTo(this.app, "routeSelected", this.rerender)
                       .listenTo(this.app, "routeUnselected", this.rerender);
                   this._updateRoutes();
               },

               className: "vehicle-etas",

               events: {
                   "click .toggle-route": "toggleRoute",
                   "click a.all-on": "allOn",
                   "click a.dir-up": "directionUp",
                   "click a.dir-down": "directionDown"
               },

               addAlert: function(alert) {
                   this.listenTo(alert, "remove", this.onAlertRemoved)
                       .listenTo(alert, "change", this.onAlertChanged);

                   this.alerts.push(alert.attributes);
               },

               clearAlert: function(alert) {
                   this.alerts = _.filter(this.alerts,
                                          function(a) {
                                              return a.id !== alert.id;
                                          });
               },

               onAlertChanged: function(alert) {
                   this.alerts = _.map(this.alerts,
                                       function(a) {
                                           return a.id == alert.id ?
                                               alert.attributes : a;
                                       });
               },

               onAlertRemoved: function(alert) {
                   this.stopListening(alert);
               },

               // TODO: Cache information about vehicle predictions, so that it
               // doesn't have to be recalculated once per sec.
               _updatePreds: function() {

               },

               _updateModeDirs: function() {
                   var stop = this.model;
                   this.modeDirections = _.reduce(
                       config.modes,
                       function(m, mode) {
                           m[mode.mode] = stop.oneWay(mode.mode) || "1";
                           return m;
                       },
                       {});
                   return this.modeDirections;
               },

               /**
                * Store information about active and inactive routes every time
                * the route selection changes.
                */
               _updateRoutes: function() {
                   var routes =  this.app.routes,
                       showMode = {};

                   this._routes = _.map(this.model.get("route_ids"),
                                        function(__, route_id) {
                                            var route = routes.get(route_id),
                                                mode = config.getRouteMode(route_id);
                                            if (route)
                                                showMode[mode] = true;

                                            return {
                                                id: route_id,
                                                active: !!route,
                                                mode: mode,
                                                shortName: routes.getRouteShortName(route_id),
                                                color: routes.getRouteColor(route_id)
                                            };
                                        });
                   this._showModes = showMode;
               },

               allSelected: function() {
                   return _.reduce(this._routes,
                                   function(s, r) { return s && r.active; });
               },

               // Redraw the view using the last stamp
               rerender: function() {
                   this._updateRoutes();
                   this.render(this.lastStamp);
               },

               render: function(stamp) {
                   if (!stamp) stamp = $u.stamp();

                   var stop = this.model,
                       dirs = this.modeDirections,
                       vehicles = this.app.vehicles,
                       routes = this.app.routes,
                       // hasPreds = {},
                       preds;

                   var data = {
                       showAllButton: this._routes.length > 1,
                       allSelected: this.allSelected(),
                       routes: this._routes,
                       name: stop.getName(),
                       stop_id: stop.id,
                       modes: []
                   };
                   this.lastStamp = stamp;

                   // Collect all the predictions
                   if (stop.isParent()) {
                       preds = $u.mapcat(stop.getChildren(),
                                         function(stop) {
                                             return stop.get("preds") || [];
                                         });
                   } else {
                       preds = stop.get("preds");
                   }

                   var groupedPreds = {},
                       // Ignore predictions more than 30 minutes in the future:
                       threshold = stamp + 1800000,
                       // Limit number of predictions shown:
                       max = Infinity,
                       cmp = function(predA, predB) {
                           var diff = predA.arr_time - predB.arr_time;

                           return diff < 0 ? -1 : diff > 0 ? 1 : 0;
                       };

                   _.each(preds, function(pred) {
                       var route_id = pred.route_id;

                       if (pred.arr_time > threshold ||
                           pred.arr_time < stamp) return;

                       // hasPreds[route_id] = true;

                       // Ignore disabled routes:
                       if (!routes.get(route_id))
                           return;

                       var key = config.getRouteMode(route_id);

                       // Ignore vehicles traveling in the wrong direction:
                       if (dirs[key] !== pred.direction) return;
                       pred.color = routes.getRouteColor(pred.route_id);
                       pred.briefRelTime = $u.briefRelTime(pred.arr_time - stamp);
                       pred.name = routes.getRouteShortName(pred.route_id);

                       if (!groupedPreds[key])
                           groupedPreds[key] = [];
                       $u.insertSorted(groupedPreds[key], pred, cmp);
                   });

                   // _.each(this._routes, function(route) {
                   //     route.hasPredictions = hasPreds[route.id];
                   // });

                   var showMode = this._showModes,
                       oneWay = stop.oneWay();
                   _.each(config.modes, function(mode) {
                       if (!showMode[mode.mode]) return;

                       data.modes.push({
                           name: mode.label,
                           key: mode.mode,
                           oneWayUp: oneWay === "1",
                           oneWayDown: oneWay === "0",
                           upDir: dirs[mode.mode] === "1",
                           preds: groupedPreds[mode.mode]});
                   });

                   if (this.alerts.length) {
                       data.alerts = this.alerts;
                   }

                   var $el = this.$el;
                   $t.render("vehicleETAs", data)
                       .then(function(html) {
                           $el.html(html);
                       });

                   return this;
               },

               directionUp: function(e) {
                   this.changeDirection(e, "1");
               },

               directionDown: function(e) {
                   this.changeDirection(e, "0");
               },

               changeDirection: function(e, dir) {
                   var mode = $(e.target).data("mode");

                   this.modeDirections[mode] = dir;
                   this.rerender();
                   e.preventDefault();
               },

               showRoute: function(e) {
                   var route_id = $(e.target).data("route");
                   this.app.addRoute(route_id);
                   // Since the route information won't be instantly
                   // available, don't bother re-rendering right away.
                   e.preventDefault();
               },

               toggleRoute: function(e) {
                   var route_id = $(e.target).attr("data-route_id");

                   if (route_id) {
                       this.app.toggleRoute(route_id);
                       this.rerender();
                   }

                   e.preventDefault();
               },

               hideRoute: function(e) {
                   var route_id = $(e.target).closest(".vehicle-pred")
                           .data("route");

                   if (route_id) {
                       this.app.toggleRoute(route_id);
                       this.rerender();
                   }

                   e.preventDefault();
               },

               allOn: function(e) {
                   var ids = _.keys(this.model.get("route_ids")),
                       app = this.app;

                   if (this.allSelected()) {
                       _.each(ids, function(id) {
                           app.removeRoute(id);
                       });
                       this.rerender();
                   } else {
                       _.each(ids, function(id) {
                           app.addRoute(id);
                       });
                   }
                   e.preventDefault();
               }
           });

           return StopVehiclesView;
       });
